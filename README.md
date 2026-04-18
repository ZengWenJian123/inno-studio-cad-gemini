# INNO 设计站 (INNO Design Station)

这是一个基于 AI 驱动的参数化 3D 建模平台，旨在通过自然语言交互降低 3D 设计的门槛。用户可以通过描述需求、上传参考图或导入 OpenSCAD 代码来快速生成高精度、可参数化调节的三维模型。

## 🚀 核心功能 (Core Features)

- **AI CAD 助手 "Inno Studio"**: 使用大语言模型（OpenAI/Gemini）将自然语言指令转化为复杂的 3D 场景描述（JSON）和 OpenSCAD 代码。
- **混合建模引擎**: 
    - **实时预览**: 使用 `@react-three/csg` 在浏览器中直接渲染布尔运算（add/subtract）组成的 3D 模型。
    - **OpenSCAD 导出**: 生成工业级的 OpenSCAD 代码，支持手动编辑和导出 STL 进行 3D 打印。
- **参数化控制**: 模型生成后，系统会自动解构出关键参数（如长、宽、高、半径等），提供 UI 滑块进行实时精细化调整。
- **模型蓝图库 (Template Gallery)**:
    - **内置模板**: 精选的典型参数化组件库（马克杯、齿轮、散热片等）。
    - **社区共享**: 用户可以将自己的创意分享到社区，供其他用户初始化和学习。
    - **个人管理**: 支持搜索、分类、重命名及删除个人上传的模板资产。
- **多端同步与云端存储**: 基于 Firebase 实现用户认证、项目自动存档和多设备访问。

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
