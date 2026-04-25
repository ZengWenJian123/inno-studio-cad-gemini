# INNO 设计站 (INNO Design Station)

这是一个基于 AI 驱动的参数化 3D 建模平台，旨在通过自然语言交互降低 3D 设计的门槛。用户可以通过描述需求、上传参考图或导入 OpenSCAD 代码来快速生成高精度、可参数化调节的三维模型。

## 🚀 核心功能 (Core Features)

- **AI CAD 助手 "INNO Studio"**: 深度集成大语言模型，将自然语言指令（或参考草图）转化为结构化的 3D 场景快照与工业级 OpenSCAD 源代码。
- **混合渲染与双向同步**: 
    - **实时 3D 预览**: 基于 `@react-three/csg` 和 Three.js，在 Web 端实时渲染参数化几何体的布尔运算模型。
    - **OpenSCAD 动态导出 (新特性)**: 自动生成专业级 `.scad` 源码。**支持将 UI 滑块调节的数值实时同步至代码体中**，提供一键复制到剪贴板或下载的功能，打通从 Web 灵感到本地打印工具链的最后一步。
    - **多格式导出**: 支持一键导出用于 3D 打印的标准 STL 及 SCAD 模型文件。
- **丰富的专业工程库生态 (Industry Standard Libraries)**: AI 大脑深入学习了数个顶级 OpenSCAD 规范库的编程范式，突破了简易几何体的限制：
    - **BOSL2 & NopSCADlib**: 核心倒角/圆角工具，支持电子电路(PCB)、五金件等工业维生素(Vitamins)构建。
    - **UB (3D打印优化)**: 具备“打印友好”机制，支持极客级 FDM 3D 打印零件的工作流优化。
    - **KeyV2 (键帽定制)**: 支持各种人体工学高度和樱桃十字轴心标准的机械键帽生成。
    - **Gridfinity-rebuilt**: 快速构建风靡 3D 打印界的桌面网格化收纳仓储系统。
    - **Threads-scad (实心螺纹)**: 赋予导出的模型精确配合的真实物理螺纹（如公制 M8），而非视觉圆柱。
    - **Getriebe (精密传动)**: 专业生成可用于机械传动的渐开线齿轮与蜗轮蜗杆。
    - **KnurledFinishLib (表面处理)**: 为模型添加逼真的工业级防滑滚花（Knurling）表面。
- **工程师模式 (Engineer Mode)**: 发出生成指令前，AI 会化身结构工程师对产品需求（如壁厚、公差、标准件安装预留）进行提问与结构确认，大幅提升模型的成功率与精准度。
- **参数化控制**: 模型生成后，自动解构关键物理参数提取至 UI 操作面板，用户可轻松滑动调整核心尺寸的变量。
- **社区蓝图共享 (Template Gallery)**:
    - 支持社区互助，一键将得意之作保存至共享库，并可基于其它用户的创意结构进行衍生与二次改写。
- **多端同步云服务**: 基于 Firebase (Auth & Firestore) 实现无缝的跨终端项目存档与状态溯源。

## 🏗️ 项目结构 (Project Structure)

```text
/
├── src/
│   ├── components/       # UI 组件
│   │   ├── ui/           # 基于 shadcn 的基础组件
│   │   ├── Sidebar.tsx   # 项目管理侧边栏
│   │   ├── ChatPanel.tsx # AI 对话交互界面
│   │   ├── Viewer.tsx    # 3D 渲染核心视图
│   │   ├── ParamPanel.tsx# 参数化调节面板
│   │   └── ...           # 导入/登录等模态框
│   ├── services/         # 业务逻辑与 API 交互
│   │   ├── aiService.ts  # 处理与 OpenAI/Gemini 接口的通讯与响应格式化
│   │   └── projectService.ts# 处理 Firebase Firestore 的项目和模板增删改查
│   ├── lib/              # 核心工具类
│   │   ├── firebase.ts   # Firebase 实例初始化
│   │   ├── scadUtils.ts  # 通用 SCAD 解析与逻辑工具
│   │   └── utils.ts      # Tailwind 类名合并等小工具
│   ├── constants/        # 静态配置与内置模板
│   ├── types.ts          # 全局 TypeScript 接口定义 (CADObject, SceneState 等)
│   ├── App.tsx           # 应用根组件，负责核心状态管理与路由调度
│   └── main.tsx          # 入口挂载文件
├── firebase.rules        # Firestore 安全规则
├── firebase-blueprint.json# 数据库结构蓝图定义
├── metadata.json         # 应用元数据（名称、描述、权限）
└── package.json          # 依赖管理与运行脚本
```

## 🛠️ 技术栈 (Tech Stack)

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **3D Rendering**: Three.js, React Three Fiber, React Three Drei, React Three CSG
- **UI Architecture**: shadcn/ui, Radix UI, Lucide Icons
- **Animation**: Motion (motion/react)
- **Backend / Authentication**: Firebase (Auth, Firestore)
- **AI**: OpenAI SDK / Google Generative AI (@google/genai)

## 🧩 关键数据结构 (Key Data Types)

- **SceneState**: 整个 3D 场景的快照，包含 `objects` (几何描述)、`parameters` (UI 控制参数) 和 `code` (OpenSCAD 源码)。
- **CADObject**: 描述单个几何基元（box, cylinder 等）及其布尔操作类型和属性。
- **Parameter**: 链接 UI 滑块与几何体属性（如 scale.x）的映射关系。

## 📝 开发者备注

此项目采用了“AI 优先”的设计理念，其响应格式经过特殊优化，以确保 LLM 能够稳定输出符合 Web 端渲染引擎（CSG）要求的简化模型。
