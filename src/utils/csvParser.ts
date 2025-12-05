import Papa from 'papaparse';
import { 
  LogData, 
  MetricAppData, 
  MetricContainerData, 
  TraceSpanData,
  RecordData,
  QueryData,
  DataType 
} from '../types/data';

export function parseCSV<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    console.log(`Starting to parse CSV file: ${file.name}, size: ${file.size} bytes`);
    
    const allData: T[] = [];
    const errors: any[] = [];
    let rowCount = 0;
    
    // 对于大文件，使用step回调来流式处理，避免内存问题
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ',', // 显式指定分隔符为逗号
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      worker: false, // 不使用Web Worker，避免兼容性问题
      step: (results) => {
        // 每处理一行数据就调用一次
        if (results.data) {
          const row = results.data as any;
          // 检查行是否有效（至少有一个非空值）
          const keys = Object.keys(row);
          if (keys.length > 0 && keys.some(key => {
            const val = row[key];
            return val !== null && val !== undefined && val !== '';
          })) {
            allData.push(row as T);
            rowCount++;
            
            // 每处理10万行输出一次进度
            if (rowCount % 100000 === 0) {
              console.log(`Parsed ${rowCount} rows so far...`);
            }
          }
        }
        
        if (results.errors && results.errors.length > 0) {
          errors.push(...results.errors);
        }
      },
      complete: (results) => {
        console.log(`CSV parsing completed. Total rows parsed: ${allData.length}, Errors: ${errors.length}`);
        
        if (allData.length > 0) {
          console.log('Sample parsed row:', allData[0]);
          console.log('Sample parsed row keys:', Object.keys(allData[0] as object));
        } else {
          console.error('No data parsed at all! File might be empty or corrupted.');
          console.log('PapaParse results:', {
            dataLength: results.data.length,
            errors: results.errors,
            meta: results.meta
          });
        }
        
        if (errors.length > 0) {
          // 过滤掉非关键错误
          const nonCriticalErrors = errors.filter(
            err => err.code === 'UndetectableDelimiter' || 
                   (err.type === 'Delimiter' && err.message?.includes('defaulted to'))
          );
          const criticalErrors = errors.filter(
            err => err.type === 'Quotes' || 
                   (err.type === 'Delimiter' && !err.message?.includes('defaulted to'))
          );
          
          if (nonCriticalErrors.length > 0) {
            console.debug('Non-critical CSV parsing warnings:', nonCriticalErrors);
          }
          
          if (criticalErrors.length > 0) {
            console.error('Critical CSV parsing errors:', criticalErrors);
          }
        }
        
        resolve(allData);
      },
      error: (error: Error) => {
        console.error('PapaParse error:', error);
        reject(error);
      },
    });
  });
}

export function parseLogData(data: any[]): LogData[] {
  return data.map(item => ({
    timestamp: Number(item.timestamp) || 0,
    rr: Number(item.rr) || 0,
    sr: Number(item.sr) || 0,
    cnt: Number(item.cnt) || 0,
    mrt: Number(item.mrt) || 0,
    tc: String(item.tc || ''),
  }));
}

export function parseMetricAppData(data: any[]): MetricAppData[] {
  return data.map(item => ({
    timestamp: Number(item.timestamp) || 0,
    rr: Number(item.rr) || 0,
    sr: Number(item.sr) || 0,
    cnt: Number(item.cnt) || 0,
    mrt: Number(item.mrt) || 0,
    tc: String(item.tc || ''),
  }));
}

export function parseMetricContainerData(data: any[]): MetricContainerData[] {
  return data.map(item => ({
    timestamp: Number(item.timestamp) || 0,
    cmdb_id: String(item.cmdb_id || ''),
    kpi_name: String(item.kpi_name || ''),
    value: Number(item.value) || 0,
  }));
}

export function parseTraceSpanData(data: any[]): TraceSpanData[] {
  if (data.length === 0) {
    console.warn('parseTraceSpanData: received empty data array');
    return [];
  }
  
  console.log('parseTraceSpanData: parsing', data.length, 'rows');
  console.log('parseTraceSpanData: sample raw item:', data[0]);
  console.log('parseTraceSpanData: sample raw item keys:', Object.keys(data[0]));
  
  const parsed = data.map(item => ({
    timestamp: Number(item.timestamp) || 0,
    cmdb_id: String(item.cmdb_id || ''),
    parent_id: String(item.parent_id || ''),
    span_id: String(item.span_id || ''),
    trace_id: String(item.trace_id || ''),
    duration: Number(item.duration) || 0,
  }));
  
  console.log('parseTraceSpanData: parsed sample:', parsed[0]);
  console.log('parseTraceSpanData: parsed', parsed.length, 'rows');
  
  return parsed;
}

export function parseRecordData(data: any[]): RecordData[] {
  return data.map(item => ({
    level: String(item.level || ''),
    component: String(item.component || ''),
    timestamp: Number(item.timestamp) || 0,
    datetime: String(item.datetime || ''),
    reason: String(item.reason || ''),
  }));
}

export function parseQueryData(data: any[]): QueryData[] {
  return data.map(item => ({
    task_index: String(item.task_index || ''),
    instruction: String(item.instruction || ''),
    scoring_points: String(item.scoring_points || ''),
  }));
}

export function detectDataType(fileName: string): DataType | null {
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes('log_service') || lowerName.includes('log')) {
    return 'log';
  }
  if (lowerName.includes('metric_app')) {
    return 'metric_app';
  }
  if (lowerName.includes('metric_container')) {
    return 'metric_container';
  }
  if (lowerName.includes('trace_span') || lowerName.includes('trace')) {
    return 'trace';
  }
  if (lowerName.includes('record')) {
    return 'record';
  }
  if (lowerName.includes('query')) {
    return 'query';
  }
  return null;
}

export async function parseFileByType(file: File, type: DataType): Promise<any[]> {
  const rawData = await parseCSV<any>(file);
  
  switch (type) {
    case 'log':
      return parseLogData(rawData);
    case 'metric_app':
      return parseMetricAppData(rawData);
    case 'metric_container':
      return parseMetricContainerData(rawData);
    case 'trace':
      return parseTraceSpanData(rawData);
    case 'record':
      return parseRecordData(rawData);
    case 'query':
      return parseQueryData(rawData);
    default:
      return rawData;
  }
}

