import { useState } from 'react';
import { ConfigProvider, Layout, Button, Upload, Card, Tabs, Space, Switch, App as AntApp } from 'antd';
import { UploadOutlined, FolderOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { LoadedData } from './types/data';
import { loadFile, loadFilesFromFileList, selectFolder } from './utils/fileUtils';
import DataPreview from './components/DataPreview';
import DataVisualization from './components/DataVisualization';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import './App.css';

const { Header, Content } = Layout;
const { useApp } = AntApp;

function AppContent() {
  const [loadedData, setLoadedData] = useState<LoadedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('preview');
  const { theme, toggleTheme, themeConfig } = useTheme();
  const { message } = useApp();

  const handleFileUpload: UploadProps['customRequest'] = async (options) => {
    const { file } = options;
    if (file instanceof File) {
      setLoading(true);
      try {
        const data = await loadFile(file);
        if (data) {
          setLoadedData([data]);
          message.success(`成功加载文件: ${file.name}`);
        } else {
          message.error('无法解析文件，请检查文件格式');
        }
      } catch (error) {
        message.error('加载文件失败');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFolderSelect = async () => {
    setLoading(true);
    try {
      const files = await selectFolder();
      if (files && files.length > 0) {
        const data = await loadFilesFromFileList(files);
        if (data.length > 0) {
          setLoadedData(data);
          message.success(`成功加载 ${data.length} 个文件`);
        } else {
          message.warning('未找到有效的CSV文件');
        }
      }
    } catch (error) {
      message.error('加载文件夹失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="app-title">OpenRCA 数据集可视化工具</h1>
          </div>
          <Space size="middle">
            <Switch
              checked={theme === 'dark'}
              onChange={toggleTheme}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              style={{ background: theme === 'dark' ? '#177ddc' : '#1890ff' }}
            />
            <Upload
              customRequest={handleFileUpload}
              showUploadList={false}
              accept=".csv"
            >
              <Button 
                type="primary"
                icon={<UploadOutlined />} 
                loading={loading}
                size="large"
              >
                选择CSV文件
              </Button>
            </Upload>
            <Button 
              type="primary"
              icon={<FolderOutlined />} 
              onClick={handleFolderSelect}
              loading={loading}
              size="large"
            >
              选择文件夹
            </Button>
          </Space>
        </div>
      </Header>
      <Content className="app-content">
        {loadedData.length > 0 ? (
          <Card className="main-card">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              items={[
                {
                  key: 'preview',
                  label: '📊 数据预览',
                  children: <DataPreview data={loadedData} />,
                },
                {
                  key: 'visualization',
                  label: '📈 数据可视化',
                  children: <DataVisualization data={loadedData} />,
                },
              ]}
            />
          </Card>
        ) : (
          <Card className="empty-state">
            <div className="empty-content">
              <div className="empty-icon">
                <FolderOutlined />
              </div>
              <h2>请选择CSV文件或文件夹</h2>
              <p>支持加载 OpenRCA 数据集的 log、trace、metric 等CSV文件</p>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ThemeWrapper />
    </ThemeProvider>
  );
}

function ThemeWrapper() {
  const { themeConfig } = useTheme();
  return (
    <ConfigProvider theme={themeConfig}>
      <AntApp>
        <AppContent />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;

