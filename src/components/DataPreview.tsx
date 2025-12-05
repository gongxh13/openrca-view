import { useState, useMemo } from 'react';
import { Table, Select, Input, Space, Card, Statistic, Row, Col, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { LoadedData } from '../types/data';
import dayjs from 'dayjs';
import _ from 'lodash';

const { Option } = Select;

interface DataPreviewProps {
  data: LoadedData[];
}

function DataPreview({ data }: DataPreviewProps) {
  const [selectedDataType, setSelectedDataType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(50);

  // 获取所有数据类型和日期
  const dataTypes = useMemo(() => {
    const types = Array.from(new Set(data.map(d => d.type)));
    return types;
  }, [data]);

  const dates = useMemo(() => {
    const dateSet = new Set<string>();
    data.forEach(d => {
      if (d.date) dateSet.add(d.date);
    });
    return Array.from(dateSet).sort();
  }, [data]);

  // 过滤数据
  const filteredData = useMemo(() => {
    let result = data;
    
    if (selectedDataType !== 'all') {
      result = result.filter(d => d.type === selectedDataType);
    }
    
    if (selectedDate !== 'all') {
      result = result.filter(d => d.date === selectedDate);
    }
    
    return result;
  }, [data, selectedDataType, selectedDate]);

  // 统计数据
  const statistics = useMemo(() => {
    const stats = {
      totalFiles: filteredData.length,
      totalRows: filteredData.reduce((sum, d) => sum + d.data.length, 0),
      dataTypes: filteredData.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] || 0) + d.data.length;
        return acc;
      }, {} as Record<string, number>),
    };
    return stats;
  }, [filteredData]);

  // 获取表格列定义
  const getColumns = (type: string): ColumnsType<any> => {
    switch (type) {
      case 'log':
      case 'metric_app':
        return [
          {
            title: '时间戳',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 150,
            render: (ts: number) => dayjs.unix(ts).format('YYYY-MM-DD HH:mm:ss'),
            sorter: (a, b) => a.timestamp - b.timestamp,
          },
          {
            title: '服务名称',
            dataIndex: 'tc',
            key: 'tc',
            width: 150,
          },
          {
            title: '响应率 (%)',
            dataIndex: 'rr',
            key: 'rr',
            width: 120,
            sorter: (a, b) => a.rr - b.rr,
            render: (val: number) => val.toFixed(2),
          },
          {
            title: '成功率 (%)',
            dataIndex: 'sr',
            key: 'sr',
            width: 120,
            sorter: (a, b) => a.sr - b.sr,
            render: (val: number) => val.toFixed(2),
          },
          {
            title: '请求数',
            dataIndex: 'cnt',
            key: 'cnt',
            width: 100,
            sorter: (a, b) => a.cnt - b.cnt,
          },
          {
            title: '平均响应时间 (ms)',
            dataIndex: 'mrt',
            key: 'mrt',
            width: 150,
            sorter: (a, b) => a.mrt - b.mrt,
            render: (val: number) => val.toFixed(2),
          },
        ];
      
      case 'metric_container':
        return [
          {
            title: '时间戳',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 150,
            render: (ts: number) => dayjs.unix(ts).format('YYYY-MM-DD HH:mm:ss'),
            sorter: (a, b) => a.timestamp - b.timestamp,
          },
          {
            title: '组件ID',
            dataIndex: 'cmdb_id',
            key: 'cmdb_id',
            width: 150,
          },
          {
            title: '指标名称',
            dataIndex: 'kpi_name',
            key: 'kpi_name',
            width: 250,
          },
          {
            title: '指标值',
            dataIndex: 'value',
            key: 'value',
            width: 120,
            sorter: (a, b) => a.value - b.value,
            render: (val: number) => val.toFixed(4),
          },
        ];
      
      case 'trace':
        return [
          {
            title: '时间戳',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 150,
            render: (ts: number) => dayjs.unix(ts / 1000).format('YYYY-MM-DD HH:mm:ss.SSS'),
            sorter: (a, b) => a.timestamp - b.timestamp,
          },
          {
            title: '组件ID',
            dataIndex: 'cmdb_id',
            key: 'cmdb_id',
            width: 150,
          },
          {
            title: 'Trace ID',
            dataIndex: 'trace_id',
            key: 'trace_id',
            width: 200,
          },
          {
            title: 'Span ID',
            dataIndex: 'span_id',
            key: 'span_id',
            width: 200,
          },
          {
            title: '父Span ID',
            dataIndex: 'parent_id',
            key: 'parent_id',
            width: 200,
          },
          {
            title: '持续时间 (ms)',
            dataIndex: 'duration',
            key: 'duration',
            width: 120,
            sorter: (a, b) => a.duration - b.duration,
          },
        ];
      
      case 'record':
        return [
          {
            title: '级别',
            dataIndex: 'level',
            key: 'level',
            width: 100,
          },
          {
            title: '组件',
            dataIndex: 'component',
            key: 'component',
            width: 150,
          },
          {
            title: '时间',
            dataIndex: 'datetime',
            key: 'datetime',
            width: 180,
            sorter: (a, b) => a.timestamp - b.timestamp,
          },
          {
            title: '原因',
            dataIndex: 'reason',
            key: 'reason',
            width: 250,
          },
        ];
      
      case 'query':
        return [
          {
            title: '任务索引',
            dataIndex: 'task_index',
            key: 'task_index',
            width: 120,
          },
          {
            title: '指令',
            dataIndex: 'instruction',
            key: 'instruction',
            ellipsis: true,
          },
          {
            title: '评分点',
            dataIndex: 'scoring_points',
            key: 'scoring_points',
            ellipsis: true,
          },
        ];
      
      default:
        return [];
    }
  };

  // 获取当前显示的数据
  const currentData = useMemo(() => {
    if (filteredData.length === 0) return [];
    
    // 如果只选择了一个文件，显示该文件的数据
    if (filteredData.length === 1) {
      let tableData = filteredData[0].data;
      console.log('Current file data:', {
        fileName: filteredData[0].fileName,
        type: filteredData[0].type,
        dataLength: tableData.length,
        sample: tableData[0]
      });
      
      // 应用搜索过滤
      if (searchText) {
        const lowerSearch = searchText.toLowerCase();
        tableData = tableData.filter((row: any) => {
          return Object.values(row).some(val => 
            String(val).toLowerCase().includes(lowerSearch)
          );
        });
      }
      
      // 确保每条数据都有唯一的key
      return tableData.map((row: any, index: number) => ({
        ...row,
        key: row.key || row.id || `row-${index}`,
      }));
    }
    
    // 多个文件时，显示文件列表
    return filteredData.map((d, index) => ({
      key: d.fileName || `file-${index}`,
      fileName: d.fileName,
      type: d.type,
      date: d.date,
      rowCount: d.data.length,
    }));
  }, [filteredData, searchText]);

  // 多文件时的列定义
  const fileListColumns: ColumnsType<any> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
    },
    {
      title: '数据类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '行数',
      dataIndex: 'rowCount',
      key: 'rowCount',
      render: (count: number) => count.toLocaleString(),
    },
  ];

  const isFileList = filteredData.length > 1;
  const currentType = filteredData.length === 1 ? filteredData[0].type : '';

  return (
    <div>
      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="文件数" value={statistics.totalFiles} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总行数" value={statistics.totalRows} />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {Object.entries(statistics.dataTypes).map(([type, count]) => (
                <Tag key={type} color="blue">
                  {type}: {count.toLocaleString()}
                </Tag>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 过滤控件 */}
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select
            style={{ width: 200 }}
            value={selectedDataType}
            onChange={setSelectedDataType}
            placeholder="选择数据类型"
          >
            <Option value="all">所有类型</Option>
            {dataTypes.map(type => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
          
          <Select
            style={{ width: 200 }}
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="选择日期"
          >
            <Option value="all">所有日期</Option>
            {dates.map(date => (
              <Option key={date} value={date}>{date}</Option>
            ))}
          </Select>
          
          {!isFileList && (
            <Input
              placeholder="搜索..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          )}
        </Space>
      </Card>

      {/* 数据表格 */}
      {currentData.length === 0 && filteredData.length > 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>数据为空或正在加载中...</p>
            <p style={{ color: '#999', fontSize: '12px' }}>
              文件: {filteredData[0]?.fileName} | 
              类型: {filteredData[0]?.type} | 
              数据行数: {filteredData[0]?.data?.length || 0}
            </p>
          </div>
        </Card>
      ) : (
        <Table
          columns={isFileList ? fileListColumns : getColumns(currentType)}
          dataSource={isFileList ? currentData : currentData}
          pagination={{
            pageSize,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            pageSizeOptions: ['20', '50', '100', '200'],
            onShowSizeChange: (_, size) => setPageSize(size),
          }}
          scroll={{ x: 'max-content', y: 600 }}
          size="small"
        />
      )}
    </div>
  );
}

export default DataPreview;

