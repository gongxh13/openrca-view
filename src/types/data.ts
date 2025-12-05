// 数据类型定义

export interface LogData {
  timestamp: number;
  rr: number; // response rate
  sr: number; // success rate
  cnt: number; // count
  mrt: number; // mean response time
  tc: string; // service name
}

export interface MetricAppData {
  timestamp: number;
  rr: number;
  sr: number;
  cnt: number;
  mrt: number;
  tc: string;
}

export interface MetricContainerData {
  timestamp: number;
  cmdb_id: string;
  kpi_name: string;
  value: number;
}

export interface TraceSpanData {
  timestamp: number;
  cmdb_id: string;
  parent_id: string;
  span_id: string;
  trace_id: string;
  duration: number;
}

export interface RecordData {
  level: string;
  component: string;
  timestamp: number;
  datetime: string;
  reason: string;
}

export interface QueryData {
  task_index: string;
  instruction: string;
  scoring_points: string;
}

export type DataType = 'log' | 'metric_app' | 'metric_container' | 'trace' | 'record' | 'query';

export interface LoadedData {
  type: DataType;
  date?: string;
  data: any[];
  fileName: string;
}

