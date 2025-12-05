import { useState, useMemo, useEffect } from 'react';
import { Card, Select, Row, Col, Space, DatePicker } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { LoadedData, LogData, MetricContainerData, TraceSpanData } from '../types/data';
import { useTheme } from '../contexts/ThemeContext';
import dayjs, { Dayjs } from 'dayjs';
import _ from 'lodash';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface DataVisualizationProps {
  data: LoadedData[];
}

function DataVisualization({ data }: DataVisualizationProps) {
  const [selectedDataType, setSelectedDataType] = useState<string>('log');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [selectedKpis, setSelectedKpis] = useState<string[]>([]);
  const [hiddenKpis, setHiddenKpis] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const { theme } = useTheme();

  // 获取当前数据类型的数据
  const currentData = useMemo(() => {
    return data.filter(d => d.type === selectedDataType);
  }, [data, selectedDataType]);

  // 获取数据的时间范围 - 基于所有加载的数据，而不是过滤后的数据
  const dataTimeRange = useMemo(() => {
    if (data.length === 0) return null;
    
    let minTime: number | null = null;
    let maxTime: number | null = null;

    // 遍历所有数据，找到最小和最大时间
    data.forEach(d => {
      if (d.type === 'log' || d.type === 'metric_app') {
        (d.data as LogData[]).forEach(item => {
          if (item.timestamp) {
            if (minTime === null || item.timestamp < minTime) minTime = item.timestamp;
            if (maxTime === null || item.timestamp > maxTime) maxTime = item.timestamp;
          }
        });
      } else if (d.type === 'metric_container') {
        (d.data as MetricContainerData[]).forEach(item => {
          if (item.timestamp) {
            if (minTime === null || item.timestamp < minTime) minTime = item.timestamp;
            if (maxTime === null || item.timestamp > maxTime) maxTime = item.timestamp;
          }
        });
      } else if (d.type === 'trace') {
        (d.data as TraceSpanData[]).forEach(item => {
          const ts = item.timestamp / 1000; // trace的时间戳是毫秒
          if (minTime === null || ts < minTime) minTime = ts;
          if (maxTime === null || ts > maxTime) maxTime = ts;
        });
      }
    });

    if (minTime === null || maxTime === null) return null;
    return [dayjs.unix(minTime), dayjs.unix(maxTime)];
  }, [data]);

  // 时间过滤函数
  const isInTimeRange = (timestamp: number): boolean => {
    if (!timeRange || !timeRange[0] || !timeRange[1]) return true;
    const time = dayjs.unix(timestamp);
    return time.isAfter(timeRange[0].subtract(1, 'second')) && time.isBefore(timeRange[1].add(1, 'second'));
  };

  // trace时间过滤函数（时间戳是毫秒）
  const isTraceInTimeRange = (timestamp: number): boolean => {
    if (!timeRange || !timeRange[0] || !timeRange[1]) return true;
    const time = dayjs.unix(timestamp / 1000);
    return time.isAfter(timeRange[0].subtract(1, 'second')) && time.isBefore(timeRange[1].add(1, 'second'));
  };

  // 数据采样函数 - 当数据点过多时进行均匀采样
  const sampleData = <T extends { time: string; timestamp?: number }>(
    data: T[],
    maxPoints: number = 1500
  ): T[] => {
    if (data.length <= maxPoints) return data;
    
    // 按时间戳排序（如果有）
    const sorted = data.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.time.localeCompare(b.time);
    });
    
    // 计算采样间隔
    const step = Math.ceil(sorted.length / maxPoints);
    const sampled: T[] = [];
    
    // 均匀采样，确保包含首尾数据点
    for (let i = 0; i < sorted.length; i += step) {
      sampled.push(sorted[i]);
    }
    
    // 确保包含最后一个数据点
    if (sampled[sampled.length - 1] !== sorted[sorted.length - 1]) {
      sampled[sampled.length - 1] = sorted[sorted.length - 1];
    }
    
    return sampled;
  };

  // 处理Log/Metric App数据 - 按时间分组，每个时间点包含所有服务的值
  const processLogData = useMemo(() => {
    if (currentData.length === 0) return [];
    
    const allData: LogData[] = [];
    currentData.forEach(d => {
      if (d.type === 'log' || d.type === 'metric_app') {
        allData.push(...(d.data as LogData[]));
      }
    });

    // 过滤选中的服务
    let filteredData = allData;
    if (selectedService !== 'all') {
      filteredData = filteredData.filter(d => d.tc === selectedService);
    }

    // 应用时间过滤
    if (timeRange && timeRange[0] && timeRange[1]) {
      filteredData = filteredData.filter(d => isInTimeRange(d.timestamp));
    }

    // 获取所有服务
    const services = Array.from(new Set(filteredData.map(d => d.tc))).slice(0, 5);
    
    // 按时间分组
    const timeGrouped = _.groupBy(filteredData, item => 
      dayjs.unix(item.timestamp).format('YYYY-MM-DD HH:mm')
    );
    
    // 转换为图表数据格式：每个时间点包含所有服务的指标值
    const result: any[] = [];
    Object.entries(timeGrouped).forEach(([time, items]) => {
      const timeData: any = { time };
      
      services.forEach(service => {
        const serviceItems = items.filter(item => item.tc === service);
        if (serviceItems.length > 0) {
          timeData[`${service}_rr`] = _.meanBy(serviceItems, 'rr');
          timeData[`${service}_sr`] = _.meanBy(serviceItems, 'sr');
          timeData[`${service}_mrt`] = _.meanBy(serviceItems, 'mrt');
        }
      });
      
      result.push(timeData);
    });
    
    const sorted = result.sort((a, b) => a.time.localeCompare(b.time));
    
    // 如果数据点过多，进行采样
    return sampleData(sorted, 1500);
  }, [currentData, selectedService, timeRange]);

  // 处理Metric Container数据
  const processMetricContainerData = useMemo(() => {
    if (currentData.length === 0) return [];
    
    // 先按时间戳分组，然后按KPI分组，这样可以覆盖全天数据
    // 使用Map来存储，避免内存问题
    const timeKpiMap = new Map<string, {
      time: string;
      kpi: string;
      component: string;
      values: number[];
      timestamp: number;
    }>();
    
    try {
      currentData.forEach(d => {
        if (d.type === 'metric_container' && Array.isArray(d.data)) {
          const dataArray = d.data as MetricContainerData[];
          
          // 先应用组件过滤
          let filtered = dataArray;
          if (selectedComponent !== 'all') {
            filtered = filtered.filter(item => item.cmdb_id === selectedComponent);
          }
          
          // 应用时间过滤
          if (timeRange && timeRange[0] && timeRange[1]) {
            filtered = filtered.filter(item => isInTimeRange(item.timestamp));
          }
          
          // 按时间戳分组（按分钟分组，减少数据点）
          const timeGrouped = _.groupBy(filtered, item => {
            const time = dayjs.unix(item.timestamp);
            // 按分钟分组，这样可以覆盖全天但减少数据点
            return time.format('YYYY-MM-DD HH:mm');
          });
          
          // 处理每个时间点的数据
          Object.entries(timeGrouped).forEach(([timeKey, timeItems]) => {
            // 按KPI分组
            const kpiGrouped = _.groupBy(timeItems, 'kpi_name');
            
            Object.entries(kpiGrouped).forEach(([kpi, kpiItems]) => {
              if (kpiItems.length > 0) {
                const key = `${timeKey}_${kpi}`;
                const timestamp = kpiItems[0].timestamp;
                
                if (!timeKpiMap.has(key)) {
                  timeKpiMap.set(key, {
                    time: timeKey,
                    kpi,
                    component: kpiItems[0].cmdb_id || '',
                    values: [],
                    timestamp,
                  });
                }
                
                // 收集所有值
                const entry = timeKpiMap.get(key)!;
                kpiItems.forEach(item => {
                  entry.values.push(item.value);
                });
              }
            });
          });
        }
      });
    } catch (error) {
      console.error('Error processing metric container data:', error);
      return [];
    }

    if (timeKpiMap.size === 0) return [];

    // 转换为结果格式
    const result: any[] = [];
    timeKpiMap.forEach((entry) => {
      result.push({
        time: entry.time,
        kpi: entry.kpi,
        component: entry.component,
        avgValue: _.mean(entry.values),
        maxValue: _.max(entry.values) || 0,
        minValue: _.min(entry.values) || 0,
        timestamp: entry.timestamp,
      });
    });
    
    // 按时间戳排序，确保时间顺序正确
    return result.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return a.time.localeCompare(b.time);
    });
  }, [currentData, selectedComponent, timeRange]);

  // 处理Trace数据
  const processTraceData = useMemo(() => {
    if (currentData.length === 0) return [];
    
    const allData: TraceSpanData[] = [];
    currentData.forEach(d => {
      if (d.type === 'trace') {
        allData.push(...(d.data as TraceSpanData[]));
      }
    });

    // 按组件过滤
    let filtered = allData;
    if (selectedComponent !== 'all') {
      filtered = filtered.filter(d => d.cmdb_id === selectedComponent);
    }

    // 应用时间过滤
    if (timeRange && timeRange[0] && timeRange[1]) {
      filtered = filtered.filter(d => isTraceInTimeRange(d.timestamp));
    }

    // 按时间分组统计
    const timeGrouped = _.groupBy(filtered, item => 
      dayjs.unix(item.timestamp / 1000).format('YYYY-MM-DD HH:mm')
    );
    
    const result: any[] = [];
    Object.entries(timeGrouped).forEach(([time, items]) => {
      result.push({
        time,
        count: items.length,
        avgDuration: _.meanBy(items, 'duration'),
        maxDuration: _.maxBy(items, 'duration')?.duration || 0,
        minDuration: _.minBy(items, 'duration')?.duration || 0,
      });
    });
    
    const sorted = result.sort((a, b) => a.time.localeCompare(b.time));
    
    // 如果数据点过多，进行采样
    return sampleData(sorted, 1500);
  }, [currentData, selectedComponent, timeRange]);

  // 获取服务列表
  const services = useMemo(() => {
    const serviceSet = new Set<string>();
    currentData.forEach(d => {
      if (d.type === 'log' || d.type === 'metric_app') {
        (d.data as LogData[]).forEach(item => {
          if (item.tc) serviceSet.add(item.tc);
        });
      }
    });
    return Array.from(serviceSet).sort();
  }, [currentData]);

  // 获取组件列表
  const components = useMemo(() => {
    const componentSet = new Set<string>();
    currentData.forEach(d => {
      if (d.type === 'metric_container') {
        (d.data as MetricContainerData[]).forEach(item => {
          if (item.cmdb_id) componentSet.add(item.cmdb_id);
        });
      }
      if (d.type === 'trace') {
        (d.data as TraceSpanData[]).forEach(item => {
          if (item.cmdb_id) componentSet.add(item.cmdb_id);
        });
      }
    });
    return Array.from(componentSet).sort();
  }, [currentData]);

  // 获取所有KPI列表
  const allKpis = useMemo(() => {
    if (selectedDataType !== 'metric_container') return [];
    const kpiSet = new Set<string>();
    processMetricContainerData.forEach(item => {
      if (item.kpi) kpiSet.add(item.kpi);
    });
    return Array.from(kpiSet).sort();
  }, [selectedDataType, processMetricContainerData]);

  // 当数据类型或组件改变时，只重置KPI选择，不重置时间范围
  useEffect(() => {
    setSelectedKpis([]);
    setHiddenKpis(new Set());
  }, [selectedDataType, selectedComponent]);

  // 生成颜色 - 根据主题调整
  const colors = theme === 'dark' 
    ? ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347']
    : ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'];
  
  const textColor = theme === 'dark' ? '#ffffff' : '#262626';
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  // 渲染图表
  const renderCharts = () => {
    if (selectedDataType === 'log' || selectedDataType === 'metric_app') {
      const selectedServices = services.filter(s => selectedService === 'all' || s === selectedService).slice(0, 5);
      
      // 检查是否需要显示采样提示
      const originalDataCount = processLogData.length;
      const isSampled = originalDataCount > 1500;
      
      return (
        <>
          {isSampled && (
            <Card style={{ marginBottom: 16, backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fffbe6', borderColor: theme === 'dark' ? '#434343' : '#ffe58f' }}>
              <div style={{ color: theme === 'dark' ? '#ffa940' : '#fa8c16', fontSize: 12 }}>
                ⚠️ 数据量较大，已自动采样显示 {processLogData.length} 个数据点以保持图表流畅性
              </div>
            </Card>
          )}
          <Card title="响应率趋势" style={{ marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={processLogData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="time" angle={-45} textAnchor="end" height={100} stroke={textColor} />
                <YAxis stroke={textColor} />
                <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff', border: `1px solid ${gridColor}` }} />
                <Legend wrapperStyle={{ color: textColor }} />
                {selectedServices.map((service, index) => (
                  <Line
                    key={service}
                    type="monotone"
                    dataKey={`${service}_rr`}
                    name={`${service} - 响应率`}
                    stroke={colors[index % colors.length]}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Card>
          
          <Row gutter={16}>
            <Col span={12}>
              <Card title="成功率趋势">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processLogData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="time" angle={-45} textAnchor="end" height={100} stroke={textColor} />
                    <YAxis stroke={textColor} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff', border: `1px solid ${gridColor}` }} />
                    <Legend wrapperStyle={{ color: textColor }} />
                    {selectedServices.slice(0, 3).map((service, index) => (
                      <Line
                        key={service}
                        type="monotone"
                        dataKey={`${service}_sr`}
                        name={`${service} - 成功率`}
                        stroke={colors[index % colors.length]}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="平均响应时间趋势">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processLogData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="time" angle={-45} textAnchor="end" height={100} stroke={textColor} />
                    <YAxis stroke={textColor} />
                    <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff', border: `1px solid ${gridColor}` }} />
                    <Legend wrapperStyle={{ color: textColor }} />
                    {selectedServices.slice(0, 3).map((service, index) => (
                      <Line
                        key={service}
                        type="monotone"
                        dataKey={`${service}_mrt`}
                        name={`${service} - 平均响应时间`}
                        stroke={colors[index % colors.length]}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </>
      );
    }
    
    if (selectedDataType === 'metric_container') {
      // 重构数据格式：按时间分组，每个时间点包含所有KPI的值
      if (processMetricContainerData.length === 0) {
        return <Card>暂无数据</Card>;
      }
      
      // 使用选中的KPI，如果没有选中则显示所有KPI（最多20个）
      const allKpiNames = selectedKpis.length > 0 
        ? selectedKpis 
        : Array.from(new Set(
            processMetricContainerData
              .map(d => d.kpi)
              .filter((kpi): kpi is string => !!kpi)
          )).slice(0, 20);
      
      // 过滤掉隐藏的KPI
      const kpiNames = allKpiNames.filter(kpi => !hiddenKpis.has(kpi));
      
      if (allKpiNames.length === 0) {
        return <Card>暂无有效的KPI数据</Card>;
      }
      
      // 按时间戳分组，确保时间顺序正确
      const timeGrouped = _.groupBy(processMetricContainerData, item => item.timestamp);
      
      // 转换为图表数据格式
      const chartData = Object.entries(timeGrouped)
        .map(([timestamp, items]) => {
          const timeData: any = { 
            time: items[0]?.time || dayjs.unix(Number(timestamp)).format('YYYY-MM-DD HH:mm:ss'),
            timestamp: Number(timestamp)
          };
          
          kpiNames.forEach(kpi => {
            const kpiItems = items.filter(item => item.kpi === kpi);
            if (kpiItems.length > 0) {
              timeData[kpi] = _.meanBy(kpiItems, 'avgValue');
            }
          });
          
          return timeData;
        })
        .sort((a, b) => a.timestamp - b.timestamp);
      
      // 如果数据点过多，进行采样
      const sampledData = sampleData(chartData, 1500);
      
      return (
        <Card title="容器指标趋势">
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, color: textColor }}>
              已选择 {allKpiNames.length} 个KPI，显示 {kpiNames.length} 个，隐藏 {hiddenKpis.size} 个，共 {sampledData.length} 个数据点
              {chartData.length > sampledData.length && (
                <span style={{ marginLeft: 8, color: theme === 'dark' ? '#ffa940' : '#fa8c16' }}>
                  (原始数据 {chartData.length} 个点，已采样)
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: theme === 'dark' ? '#8c8c8c' : '#595959', marginTop: 4 }}>
              提示：点击图例可以切换KPI的显示/隐藏
            </div>
          </div>
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={sampledData} margin={{ top: 5, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="time" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                stroke={textColor}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis stroke={textColor} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff', 
                  border: `1px solid ${gridColor}`,
                  borderRadius: 8
                }} 
              />
              <Legend 
                wrapperStyle={{ color: textColor }}
                iconType="line"
                content={(props: any) => {
                  const { payload } = props;
                  if (!payload) return null;
                  
                  return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', padding: '8px 0' }}>
                      {payload.map((entry: any, index: number) => {
                        const kpiName = entry.dataKey;
                        const isHidden = hiddenKpis.has(kpiName);
                        const displayName = kpiName && kpiName.length > 30 ? kpiName.substring(0, 30) + '...' : kpiName;
                        
                        return (
                          <span
                            key={`legend-item-${index}`}
                            onClick={() => {
                              setHiddenKpis(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(kpiName)) {
                                  newSet.delete(kpiName);
                                } else {
                                  newSet.add(kpiName);
                                }
                                return newSet;
                              });
                            }}
                            style={{
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              opacity: isHidden ? 0.5 : 1,
                              transition: 'opacity 0.2s',
                              userSelect: 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: '16px',
                                height: '2px',
                                backgroundColor: entry.color,
                                opacity: isHidden ? 0.3 : 1
                              }}
                            />
                            <span style={{ color: textColor, fontSize: '12px' }}>
                              {displayName}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {allKpiNames.map((kpi, index) => {
                const isHidden = hiddenKpis.has(kpi);
                return (
                  <Line
                    key={kpi}
                    type="monotone"
                    dataKey={kpi}
                    name={kpi.length > 30 ? kpi.substring(0, 30) + '...' : kpi}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    animationDuration={300}
                    strokeOpacity={isHidden ? 0 : 1}
                    style={{ cursor: 'pointer' }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      );
    }
    
    if (selectedDataType === 'trace') {
      const isSampled = processTraceData.length > 1500;
      
      return (
        <>
          {isSampled && (
            <Card style={{ marginBottom: 16, backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fffbe6', borderColor: theme === 'dark' ? '#434343' : '#ffe58f' }}>
              <div style={{ color: theme === 'dark' ? '#ffa940' : '#fa8c16', fontSize: 12 }}>
                ⚠️ 数据量较大，已自动采样显示 {processTraceData.length} 个数据点以保持图表流畅性
              </div>
            </Card>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Trace数量趋势">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processTraceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={100} stroke={textColor} />
                  <YAxis stroke={textColor} />
                  <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff', border: `1px solid ${gridColor}` }} />
                  <Bar dataKey="count" fill={colors[0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="平均持续时间趋势">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={processTraceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="time" angle={-45} textAnchor="end" height={100} stroke={textColor} />
                  <YAxis stroke={textColor} />
                  <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#1f1f1f' : '#fff', border: `1px solid ${gridColor}` }} />
                  <Legend wrapperStyle={{ color: textColor }} />
                  <Line type="monotone" dataKey="avgDuration" name="平均持续时间" stroke={colors[1]} />
                  <Line type="monotone" dataKey="maxDuration" name="最大持续时间" stroke={colors[2]} />
                  <Line type="monotone" dataKey="minDuration" name="最小持续时间" stroke={colors[0]} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
        </>
      );
    }
    
    return <Card>暂不支持该数据类型的可视化</Card>;
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 200 }}
            value={selectedDataType}
            onChange={setSelectedDataType}
            placeholder="选择数据类型"
          >
            <Option value="log">Log</Option>
            <Option value="metric_app">Metric App</Option>
            <Option value="metric_container">Metric Container</Option>
            <Option value="trace">Trace</Option>
          </Select>
          
          {dataTimeRange && (
            <RangePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              value={timeRange}
              onChange={(dates) => {
                if (!dates || !dates[0] || !dates[1]) {
                  setTimeRange(dates as [Dayjs | null, Dayjs | null] | null);
                  return;
                }
                
                const [start, end] = dates as [Dayjs, Dayjs];
                const minDate = dataTimeRange[0];
                const maxDate = dataTimeRange[1];
                
                // 确保开始时间不早于最小时间，不晚于最大时间
                let adjustedStart = start;
                if (start.isBefore(minDate)) {
                  adjustedStart = minDate;
                } else if (start.isAfter(maxDate)) {
                  adjustedStart = maxDate;
                }
                
                // 确保结束时间不晚于最大时间，不早于最小时间
                let adjustedEnd = end;
                if (end.isAfter(maxDate)) {
                  adjustedEnd = maxDate;
                } else if (end.isBefore(minDate)) {
                  adjustedEnd = minDate;
                }
                
                // 确保开始时间不晚于结束时间
                if (adjustedStart.isAfter(adjustedEnd)) {
                  adjustedStart = adjustedEnd;
                }
                
                // 确保结束时间不早于开始时间
                if (adjustedEnd.isBefore(adjustedStart)) {
                  adjustedEnd = adjustedStart;
                }
                
                setTimeRange([adjustedStart, adjustedEnd]);
              }}
              placeholder={['开始时间', '结束时间']}
              allowClear
              style={{ width: 400 }}
              disabledDate={(current) => {
                if (!dataTimeRange || !current) return false;
                // 限制日期选择范围在数据的时间范围内
                const startOfMinDate = dataTimeRange[0].startOf('day');
                const endOfMaxDate = dataTimeRange[1].endOf('day');
                return current.isBefore(startOfMinDate) || current.isAfter(endOfMaxDate);
              }}
              disabledTime={(current, type) => {
                if (!dataTimeRange || !current) return {};
                
                const minDate = dataTimeRange[0];
                const maxDate = dataTimeRange[1];
                const isMinDay = current.isSame(minDate, 'day');
                const isMaxDay = current.isSame(maxDate, 'day');
                
                // 开始时间的限制
                if (type === 'start') {
                  const disabledHours: number[] = [];
                  const disabledMinutes: (hour: number) => number[] = (selectedHour: number) => {
                    const minutes: number[] = [];
                    if (isMinDay && selectedHour === minDate.hour()) {
                      // 在最小日期的最小小时，禁用早于最小时间的分钟
                      for (let i = 0; i < minDate.minute(); i++) {
                        minutes.push(i);
                      }
                    }
                    if (isMaxDay && selectedHour === maxDate.hour()) {
                      // 在最大日期的最大小时，禁用晚于最大时间的分钟
                      for (let i = maxDate.minute() + 1; i < 60; i++) {
                        minutes.push(i);
                      }
                    }
                    // 如果已选择结束时间，且当前日期与结束时间同一天，限制不能晚于结束时间
                    if (timeRange && timeRange[1] && current.isSame(timeRange[1], 'day') && selectedHour === timeRange[1].hour()) {
                      for (let i = timeRange[1].minute() + 1; i < 60; i++) {
                        if (!minutes.includes(i)) minutes.push(i);
                      }
                    }
                    return minutes;
                  };
                  const disabledSeconds: (hour: number, minute: number) => number[] = (selectedHour: number, selectedMinute: number) => {
                    const seconds: number[] = [];
                    if (isMinDay && selectedHour === minDate.hour() && selectedMinute === minDate.minute()) {
                      // 在最小日期的最小小时和分钟，禁用早于最小时间的秒
                      for (let i = 0; i < minDate.second(); i++) {
                        seconds.push(i);
                      }
                    }
                    if (isMaxDay && selectedHour === maxDate.hour() && selectedMinute === maxDate.minute()) {
                      // 在最大日期的最大小时和分钟，禁用晚于最大时间的秒
                      for (let i = maxDate.second() + 1; i < 60; i++) {
                        seconds.push(i);
                      }
                    }
                    // 如果已选择结束时间，且当前日期与结束时间同一天，限制不能晚于结束时间
                    if (timeRange && timeRange[1] && current.isSame(timeRange[1], 'day') && 
                        selectedHour === timeRange[1].hour() && selectedMinute === timeRange[1].minute()) {
                      for (let i = timeRange[1].second() + 1; i < 60; i++) {
                        if (!seconds.includes(i)) seconds.push(i);
                      }
                    }
                    return seconds;
                  };
                  
                  // 禁用小时
                  if (isMinDay) {
                    // 在最小日期，禁用早于最小时间的小时
                    for (let i = 0; i < minDate.hour(); i++) {
                      disabledHours.push(i);
                    }
                  }
                  if (isMaxDay) {
                    // 在最大日期，禁用晚于最大时间的小时
                    for (let i = maxDate.hour() + 1; i < 24; i++) {
                      disabledHours.push(i);
                    }
                  }
                  // 如果已选择结束时间，且当前日期与结束时间同一天，限制不能晚于结束时间
                  if (timeRange && timeRange[1] && current.isSame(timeRange[1], 'day')) {
                    for (let i = timeRange[1].hour() + 1; i < 24; i++) {
                      if (!disabledHours.includes(i)) disabledHours.push(i);
                    }
                  }
                  
                  return {
                    disabledHours: () => disabledHours,
                    disabledMinutes,
                    disabledSeconds,
                  };
                } else {
                  // 结束时间的限制
                  const disabledHours: number[] = [];
                  const disabledMinutes: (hour: number) => number[] = (selectedHour: number) => {
                    const minutes: number[] = [];
                    if (isMaxDay && selectedHour === maxDate.hour()) {
                      // 在最大日期的最大小时，禁用晚于最大时间的分钟
                      for (let i = maxDate.minute() + 1; i < 60; i++) {
                        minutes.push(i);
                      }
                    }
                    // 如果已选择开始时间，且当前日期与开始时间同一天，限制不能早于开始时间
                    if (timeRange && timeRange[0] && current.isSame(timeRange[0], 'day') && selectedHour === timeRange[0].hour()) {
                      for (let i = 0; i < timeRange[0].minute(); i++) {
                        if (!minutes.includes(i)) minutes.push(i);
                      }
                    }
                    return minutes;
                  };
                  const disabledSeconds: (hour: number, minute: number) => number[] = (selectedHour: number, selectedMinute: number) => {
                    const seconds: number[] = [];
                    if (isMaxDay && selectedHour === maxDate.hour() && selectedMinute === maxDate.minute()) {
                      // 在最大日期的最大小时和分钟，禁用晚于最大时间的秒
                      for (let i = maxDate.second() + 1; i < 60; i++) {
                        seconds.push(i);
                      }
                    }
                    // 如果已选择开始时间，且当前日期与开始时间同一天，限制不能早于开始时间
                    if (timeRange && timeRange[0] && current.isSame(timeRange[0], 'day') && 
                        selectedHour === timeRange[0].hour() && selectedMinute === timeRange[0].minute()) {
                      for (let i = 0; i < timeRange[0].second(); i++) {
                        if (!seconds.includes(i)) seconds.push(i);
                      }
                    }
                    return seconds;
                  };
                  
                  // 禁用小时
                  if (isMaxDay) {
                    // 在最大日期，禁用晚于最大时间的小时
                    for (let i = maxDate.hour() + 1; i < 24; i++) {
                      disabledHours.push(i);
                    }
                  }
                  // 如果已选择开始时间，且当前日期与开始时间同一天，限制不能早于开始时间
                  if (timeRange && timeRange[0] && current.isSame(timeRange[0], 'day')) {
                    for (let i = 0; i < timeRange[0].hour(); i++) {
                      if (!disabledHours.includes(i)) disabledHours.push(i);
                    }
                  }
                  
                  return {
                    disabledHours: () => disabledHours,
                    disabledMinutes,
                    disabledSeconds,
                  };
                }
              }}
            />
          )}
          
          {(selectedDataType === 'log' || selectedDataType === 'metric_app') && (
            <Select
              style={{ width: 200 }}
              value={selectedService}
              onChange={setSelectedService}
              placeholder="选择服务"
            >
              <Option value="all">所有服务</Option>
              {services.map(service => (
                <Option key={service} value={service}>{service}</Option>
              ))}
            </Select>
          )}
          
          {(selectedDataType === 'metric_container' || selectedDataType === 'trace') && (
            <Select
              style={{ width: 200 }}
              value={selectedComponent}
              onChange={setSelectedComponent}
              placeholder="选择组件"
            >
              <Option value="all">所有组件</Option>
              {components.map(component => (
                <Option key={component} value={component}>{component}</Option>
              ))}
            </Select>
          )}
          
          {selectedDataType === 'metric_container' && allKpis.length > 0 && (
            <Select
              mode="multiple"
              style={{ width: 400, minWidth: 300 }}
              value={selectedKpis}
              onChange={setSelectedKpis}
              placeholder="选择KPI（不选则显示前20个）"
              maxTagCount="responsive"
              showSearch
              filterOption={(input, option) => {
                const label = String(option?.label ?? option?.children ?? '');
                return label.toLowerCase().includes(input.toLowerCase());
              }}
            >
              {allKpis.map(kpi => (
                <Option key={kpi} value={kpi} label={kpi}>
                  {kpi}
                </Option>
              ))}
            </Select>
          )}
        </Space>
        {timeRange && timeRange[0] && timeRange[1] && (
          <div style={{ marginTop: 12, color: theme === 'dark' ? '#a6a6a6' : '#8c8c8c', fontSize: 12 }}>
            已选择时间范围: {timeRange[0].format('YYYY-MM-DD HH:mm:ss')} 至 {timeRange[1].format('YYYY-MM-DD HH:mm:ss')}
          </div>
        )}
      </Card>
      
      {renderCharts()}
    </div>
  );
}

export default DataVisualization;

