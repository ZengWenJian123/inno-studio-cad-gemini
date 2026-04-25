# INNO Studio 终极重构进化路径：WASM 渲染引擎 & Monaco 工业级 IDE

这份技术计划书是对标顶级 Web 3D 工具（如 OpenSCAD Studio）为您量身定制的重构方案。我们将把这套方案分为 **三个递进的战役阶段**，确保 INNO Studio 可以在不破坏现有核心功能的情况下，平滑过渡到“纯原生级”渲染平台。

---

## 一、 系统架构蓝图重构概览

我们将由现有的 **“JSON 模拟驱动”** 转向更为硬核专业的 **“SCAD 源码直驱”** 模型：

*   **旧架构路线**：AI 生成 JSON -> React 解析 JSON -> Three.js (CSG引擎) 组装原始几何体试图模仿。
*   **新架构路线**：AI 生成 SCAD 代码 -> 同步入 Monaco Editor -> Web Worker 里的 WASM 内核运行 -> 直接输出高精度 STL 面片 -> Three.js 原生渲染。完全抹平所见即所得。

---

## 二、 分布推演：三大战役计划

### ⚔️ 战役一：UI 拓扑重建与 Monaco 接入（难度：⭐⭐）

**目标：** 让 INNO 开发界面专业化，实现左中右三栏工业级布局，提供“白盒化”修码能力。
**涉及技术栈：** `@monaco-editor/react`, `react-resizable-panels`, 自定义 Monarch 语法高亮。

**步骤拆解：**
1.  **引入 Resizable Panels (拖拽分割)**：放弃目前的绝对定位叠拼，将页面重构为类似 VS Code 的并排拖动面板区：
    *   左侧区域：AI 对话栏 + 实时库配置（维持现有对话流）。
    *   中右侧区域（可拖拽分割）：上半部分放 `Threes.js Viewer` (3D预览)，下半部分放 `Monaco Editor`，右侧放提取出来的 `参数滑块` 面板。
2.  **集成 Monaco Editor**：
    *   配置 Monaco 实例，设置主题。
    *   **关键开发**：编写一份精简的 OpenSCAD 语法高亮规则（Monarch Tokens），让关键字像 `module`, `difference`, `include` 等具备代码着色。
3.  **单向数据流梳理**：
    *   AI 返回生成代码时，直接填充进 Monaco Editor。目前第一阶段，我们允许用户在编辑器修改代码后，一键点击“更新预览”。

### ⚔️ 战役二：WASM 内核接入与 Web Worker 架构（难度：⭐⭐⭐⭐）

**目标：** 这是整个系统的心脏手术。废除极度受限的 `@react-three/csg` 占位方案，将浏览器的算力发挥到极致。
**涉及技术栈：** `openscad-wasm`, `Web Workers API`, 三维模型解析器 (`three-stdlib` STLLoader)。

**步骤拆解：**
1.  **设立独立计算线程 (Web Worker)**：
    *   为了防止编译极其复杂的齿轮或倒角时“卡死”用户的浏览器网页标签，我们必须创建一个 `compiler.worker.ts`。
2.  **加载 WASM 环境**：
    *   在 Worker 中注入 `openscad-wasm`。
    *   设计通信机制：主线程将 Monaco Editor 里的字符串（Code）通过 `postMessage` 扔给 Worker。
3.  **WASM STL 转换通道**：
    *   Worker 执行 `openscad` 的命令行逻辑（相当于在虚拟系统里跑 `openscad -o out.stl in.scad`）。
    *   截获生成的 `out.stl` 的 Uint8Array 二进制 Buffer 传回主线程。
4.  **Three.js 拦截接管**：
    *   在 `Viewer.tsx` 中，销毁原有 JSON 的 `<boxGeometry>` 组装逻辑。
    *   引入 `STLLoader`。当收到 Worker 发来的 Buffer 时，使用 Loader 将它变更为原生物理 Mesh 网格并在中央渲染。现在，真实的公制螺纹和精确滚花都将纤毫毕现！

### ⚔️ 战役三：虚拟内存文件系统 (Virtual FS) 与顶级库挂载（难度：⭐⭐⭐⭐⭐）

**目标：** 让 WASM 引擎能够加载我们存在 `/public/libraries/` 下的顶级开源工作流资产 (BOSL2, Getriebe 等)。
**涉及技术栈：** `fflate` 或 `jszip` 纯前端极速解压，Emscripten File System (`FS.writeFile`)。

**步骤拆解：**
1.  **AI 前置依赖诊断**：
    *   通过正则扫描 Monaco 的代码，比如发现 `#include <BOSL2/std.scad>`，前端就侦测到需要 BOSL2 环境。
2.  **VFS 初始化挂载**：
    *   从 `/public/libraries/BOSL2.zip` 发起 HTTP Fetch 拉取压缩包。
    *   将 `.zip` 在 Worker 中极速解压缩。
3.  **内存在线烧录**：
    *   使用 WASM 实例提供的 `FS.mkdir` 和 `FS.writeFile`，把数以百计的 `.scad` 库文件按照原有的目录树写入到 WASM 专属的沙盒虚拟硬盘里。
4.  **最终编译打通**：
    *   再次执行编译时，内核通过伪造的文件系统找到了依赖头文件，完美合体为带有复杂行业组件的 STL 原生模型。

---

## 三、 对我们现状的过渡策略建议

为了保证代码不至于在一天内因为步子太大而陷入泥潭，我建议采取**“先骨架，后内脏，再经络”**的战术：

1.  **首先实施战役一**：先把 Monaco 和 Resizable Panels 装上去。页面有了工业软件的味道，同时依然靠旧版本 JSON 给 AI 过渡几天。
2.  **再啃战役二**：开启一个专供极客选项的选择器：“尝试实验性 WASM 纯净编译”，一旦走通，就能在页面里看到真实的 STL 渲染。
3.  **最后打通战役三**：当引擎稳固后，我们再把 ZIP 挂载进去，全面起飞。

您目前觉得这份路线图是否够清晰？如果您授权同意，我们可以马上**从 “战役一：引入 Monaco 编辑器与拖拽面板” 开始第一波重构革命！**
