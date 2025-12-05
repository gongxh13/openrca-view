# OpenRCA 数据集可视化工具

一个现代化的 Web 应用，用于可视化和分析 OpenRCA 数据集。支持预览和可视化 log、trace、metric 等多种类型的 CSV 数据。

## 功能特性

- 📁 **文件加载**：支持选择单个 CSV 文件或整个文件夹
- 📊 **数据预览**：表格形式展示数据，支持排序、分页、搜索
- 📈 **数据可视化**：多种图表展示数据趋势和分布
- 🔍 **筛选过滤**：按数据类型、日期、服务、组件等维度筛选
- 🎨 **现代化 UI**：使用 Ant Design 构建的美观界面

## 技术栈

- **React 18** + **TypeScript**
- **Vite** - 快速构建工具
- **Ant Design** - UI 组件库
- **Recharts** - 图表库
- **PapaParse** - CSV 解析库
- **Day.js** - 日期处理库

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动

### 3. 使用应用

- 打开浏览器访问 `http://localhost:5173`
- 点击"选择CSV文件"或"选择文件夹"按钮加载数据
- 在"数据预览"标签页查看和筛选数据
- 在"数据可视化"标签页查看图表

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist` 目录

### 预览生产构建

```bash
npm run preview
```

## 使用方法

1. **加载数据**：
   - 点击"选择CSV文件"按钮选择单个 CSV 文件
   - 或点击"选择文件夹"按钮选择包含多个 CSV 文件的文件夹

2. **数据预览**：
   - 在"数据预览"标签页查看加载的数据
   - 使用筛选器按类型、日期过滤数据
   - 使用搜索框搜索特定内容
   - 表格支持排序和分页

3. **数据可视化**：
   - 切换到"数据可视化"标签页
   - 选择数据类型（log、metric_app、metric_container、trace）
   - 选择特定的服务或组件进行过滤
   - 查看各种图表展示的数据趋势

## 支持的数据类型

- **log** / **metric_app**: 服务日志和应用指标数据
  - 字段：timestamp, rr (响应率), sr (成功率), cnt (请求数), mrt (平均响应时间), tc (服务名称)

- **metric_container**: 容器指标数据
  - 字段：timestamp, cmdb_id (组件ID), kpi_name (指标名称), value (指标值)

- **trace**: 追踪数据
  - 字段：timestamp, cmdb_id, parent_id, span_id, trace_id, duration

- **record**: 故障记录
  - 字段：level, component, timestamp, datetime, reason

- **query**: 查询任务
  - 字段：task_index, instruction, scoring_points

## 项目结构

```
openrca-view/
├── src/
│   ├── components/          # React 组件
│   │   ├── DataPreview.tsx      # 数据预览组件
│   │   └── DataVisualization.tsx # 数据可视化组件
│   ├── types/              # TypeScript 类型定义
│   │   └── data.ts
│   ├── utils/              # 工具函数
│   │   ├── csvParser.ts        # CSV 解析工具
│   │   └── fileUtils.ts        # 文件处理工具
│   ├── App.tsx             # 主应用组件
│   ├── App.css             # 应用样式
│   ├── main.tsx            # 应用入口
│   └── index.css           # 全局样式
├── datasets/               # 数据集目录（示例数据）
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 开发说明

本项目使用纯前端技术，无需后端服务。所有数据处理都在浏览器中完成，支持本地文件加载。

## License

MIT

