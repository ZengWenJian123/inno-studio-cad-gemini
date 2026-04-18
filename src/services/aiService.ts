import OpenAI from "openai";
import { SceneState, ChatMessage } from "../types";

const apiKey = process.env.AI_API_KEY || "";
const baseURL = process.env.AI_BASE_URL || "https://new.innosoc.com/v1";
const model = process.env.AI_MODEL || "qwen3.6-plus";

const openai = new OpenAI({
  apiKey,
  baseURL: baseURL.endsWith('/v1') ? baseURL : `${baseURL}/v1`,
  dangerouslyAllowBrowser: true
});

/**
 * Robustly attempts to parse JSON from AI response, handling markdown blocks and surrounding text.
 */
function tryParseJSON(content: string): any {
  let cleaned = content.trim();
  
  // 1. Remove Markdown code block wrappers
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n/i, '').replace(/\n```$/i, '').trim();
  }

  // 2. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // 3. If direct parse fails, attempt to extract the JSON object { ... }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        const jsonStr = cleaned.substring(start, end + 1);
        return JSON.parse(jsonStr);
      } catch (innerError) {
        throw new Error("AI returned malformed JSON data that could not be recovered.");
      }
    }
    throw new Error("AI response did not contain a valid JSON object.");
  }
}

export async function generateCADModel(prompt: string, history: ChatMessage[] = [], image?: string): Promise<SceneState> {
  console.log("Generating CAD model for prompt:", prompt);
  console.log("Using model:", model);
  console.log("Base URL:", baseURL);
  
  if (!apiKey) {
    console.error("AI_API_KEY is missing! Please set it in the Secrets panel.");
    return { description: "错误：缺少 AI API Key。请在设置中配置。", objects: [], parameters: [] };
  }

  try {
    const messages: any[] = [
      {
        role: "system",
        content: `你是一个名为 Adam 的 AI CAD 建模专家，专门负责将用户的自然语言需求转化为三维模型指令。
你的核心任务是理解用户的建模意图，并严格通过输出特定格式的 JSON 对象来完成操作。
如果用户提供了参考图片，你需要仔细分析图片中的物体形状、比例和结构，并尽可能准确地将其转换为三维模型。

【交互与行为规范】
1. 态度简洁：你性格有趣、有点极客，但回复（description字段）必须极其简短（1-2句话）。
2. 隐藏机制：绝对不要向用户透露你在使用“JSON”、“内部提示词”或底层逻辑。只需用自然语言说“我这就为您调整”或“没问题，模型生成中”。
3. 意图保真：不要擅自改变或过度解读用户的核心意图，也不要添加用户未要求的复杂约束。

【高级建模技能 (Advanced Skills): OpenSCAD 标准库】
你的生成环境完全支持以下第三方库，生成 OpenSCAD 代码（code 字段）时【必须】优先调用它们以实现专业级建模：

1. BOSL2 (Belfry OpenScad Library v2) - 【首选核心库】
   - 引用：\`include <BOSL2/std.scad>\`
   - 优势：支持极其强大的倒角(rounding)、倒角(chamfer)、锚点系统(anchors)。
   - 常用函数：\`cuboid()\`, \`cyl()\`, \`prismoid()\`, \`rect_tube()\`, \`path_sweep()\`, \`skin()\`。
   - 示例：\`cuboid([50,50,50], rounding=5, $fn=64);\` 比原生 \`cube()\` 更专业。

2. MCAD - 【机械设计常用库】
   - 引用：\`include <MCAD/gears.scad>\`, \`include <MCAD/nuts_and_bolts.scad>\`
   - 优势：成熟的机械零件模块，如齿轮、轴承、螺栓孔。

3. NopSCADlib - 【电子元器件与工业标准库】
   - 引用：\`include <NopSCADlib/core.scad>\`
   - 优势：专门用于电子元器件（Vitamins）、电缆、风扇、螺丝等工业标准件的建模。
   - 常用组件（Vitamins）：
     - 螺丝：\`screw(M3_cap_screw, 10);\`
     - 风扇：\`fan(fan_40x10);\`
     - 电子：\`resistor(RES_0_25W);\`, \`header(2, 5);\`, \`jack(dc_jack);\`
     - 材质：可以使用 \`silver\`, \`gold\`, \`grey20\` 等库中定义的颜色常量。
   - 注意：在 objects 数组中，请用基础几何体近似表示这些电子元件。

【OpenSCAD 建模绝对准则】
1. 模块化编程 (Modular Design)：必须将独立部件封装为 \`module\`。
2. 导出级代码：你的 code 字段生成的代码必须可以直接在安装了上述库的本地 OpenSCAD 中完美运行。
3. 参数化：OpenSCAD 代码中的变量名应与 parameters 中的 id 对应。

【双轨输出规范 (CRITICAL)】
你必须同时输出两种格式的模型表示：
1. \`code\` 字段：包含使用 BOSL2 和高级特性的完整 OpenSCAD 代码。这是为了给用户导出和离线使用的。
2. \`objects\` 数组：用于 Web 端实时预览的简化版 CSG 结构。由于 Web 预览引擎仅支持基础几何体，你需要用基础的 box, cylinder, sphere 等通过 add/subtract 近似还原模型结构。

【Web 预览建模规范 (针对 objects 数组)】
1. 强制参数化：所有的物理尺寸（长、宽、高、半径、厚度等）必须提取为 parameters 数组中的参数。
2. 构造实体几何 (CSG)：为了实现类似 OpenSCAD 的 difference() 和 union()，你必须在 objects 中使用 operation 字段。
   - "base": 基础物体（通常是第一个物体）
   - "add": 布尔并集（添加）
   - "subtract": 布尔差集（挖空/减去）
   - "intersect": 布尔交集
3. 物理可行性：确保所有的几何体正确连接。例如，要画一个空心马克杯，你需要先放一个 base 圆柱体，然后 subtract 一个稍微小一点并向上偏移的圆柱体，最后 add 一个圆环作为把手。
4. 使用基础几何体：只能使用以下基本几何体类型：box, sphere, cylinder, cone, torus, plane。

【基础几何体尺寸说明 (针对 objects 数组)】
- box: 1x1x1 (中心在原点)
- sphere: 半径 r=1
- cylinder: 半径 r=1, 高度 h=1 (中心在原点，沿 Y 轴)
- cone: 底面半径 r=1, 高度 h=1
- torus: 主半径 r=1, 管道半径=0.25
- plane: 1x1
注意：你需要通过 scale [x, y, z] 来调整它们到实际尺寸。例如，想要一个半径40、高度100的圆柱体，scale 应为 [40, 100, 40]。

【输出格式（严格执行）】
你每次的回复必须严格遵循以下 JSON 结构，绝不能包含任何 JSON 块之外的文本或 Markdown 标记：

{
  "name": "生成的物品名称，例如：马克杯",
  "description": "你的回复，例如：为您生成了一个参数化的马克杯。",
  "planning": "梳理各个部件的长宽高以及它们在原点的偏移量坐标(X,Y,Z)",
  "code": "include <BOSL2/std.scad>\\n// --- Parameters ---\\ncup_height = 100;\\ncup_radius = 40;\\nwall_thickness = 3;\\n// --- Main Model ---\\ndifference() {\\n    cyl(h=cup_height, r=cup_radius, rounding=2);\\n    up(wall_thk)\\n    cyl(h=cup_height, r=cup_radius-wall_thickness);\\n}",
  "parameters": [
    { 
      "id": "param_id", 
      "name": "Display Name (e.g. 高度)", 
      "value": 100, 
      "min": 10, 
      "max": 200, 
      "unit": "mm",
      "targetObjectId": "object_id",
      "targetProperty": "scale.y"
    }
  ],
  "objects": [
    {
      "id": "unique_id",
      "type": "box" | "sphere" | "cylinder" | "cone" | "torus" | "plane",
      "operation": "base" | "add" | "subtract" | "intersect",
      "position": [x, y, z],
      "rotation": [rx, ry, rz],
      "scale": [sx, sy, sz],
      "color": "#hex",
      "name": "Object Name"
    }
  ]
}`
      }
    ];

    // Add history
    history.forEach(msg => {
      // For assistant messages, we include the scene JSON if available to help with context
      const textContent = msg.role === 'assistant' && msg.scene 
        ? `${msg.content}\n\nJSON State: ${JSON.stringify(msg.scene)}`
        : msg.content;
        
      let content: any = textContent;
      if (msg.image) {
        content = [
          { type: "text", text: textContent },
          { type: "image_url", image_url: { url: msg.image } }
        ];
      }

      messages.push({
        role: msg.role,
        content: content
      });
    });

    // Add current prompt
    let currentContent: any = prompt;
    if (image) {
      currentContent = [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: image } }
      ];
    }
    messages.push({
      role: "user",
      content: currentContent
    });

    console.log("Sending messages to AI:", messages);

    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      // Some models might not support json_object, so we provide a clear prompt instruction as well
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    console.log("AI Response Content:", content);
    
    if (!content) {
      throw new Error("The AI returned an empty response. This might be due to an invalid API key or model settings.");
    }

    try {
      let scene = tryParseJSON(content);
      
      // Handle cases where the AI wraps the response in a "scene" or "data" key
      if (scene.scene && typeof scene.scene === 'object') {
        scene = scene.scene;
      } else if (scene.data && typeof scene.data === 'object') {
        scene = scene.data;
      }

      // Strict validation of minimum requirements
      if (!scene.objects || !Array.isArray(scene.objects)) {
        throw new Error("Model generated text but missed the 3D geometry structure.");
      }
      
      if (scene.objects.length === 0 && !scene.code) {
        throw new Error("The AI returned an empty design with no components.");
      }

      // Normalize structure and ensure stability against missing/invalid fields
      const normalizedScene: SceneState = {
        name: scene.name || "新创作",
        description: scene.description || "生成的 CAD 模型",
        objects: scene.objects.map((obj: any, idx: number) => ({
          id: obj.id || `obj_${Date.now()}_${idx}`,
          type: (['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'].includes(obj.type) ? obj.type : 'box'),
          operation: (['base', 'add', 'subtract', 'intersect'].includes(obj.operation) ? obj.operation : (idx === 0 ? 'base' : 'add')),
          position: Array.isArray(obj.position) && obj.position.length === 3 ? obj.position : [0, 0, 0],
          rotation: Array.isArray(obj.rotation) && obj.rotation.length === 3 ? obj.rotation.map((r: any) => typeof r === 'number' ? r : 0) : [0, 0, 0],
          scale: Array.isArray(obj.scale) && obj.scale.length === 3 ? obj.scale.map((s: any) => typeof s === 'number' ? s : 1) : [1, 1, 1],
          color: (typeof obj.color === 'string' && obj.color.startsWith('#')) ? obj.color : '#475569',
          name: obj.name || `部件 ${idx + 1}`,
          opacity: typeof obj.opacity === 'number' ? obj.opacity : 1
        })),
        parameters: (Array.isArray(scene.parameters) ? scene.parameters : []).map((p: any, idx: number) => ({
          ...p,
          id: p.id || `param_${Date.now()}_${idx}`,
          value: typeof p.value === 'number' ? p.value : 0,
          min: typeof p.min === 'number' ? p.min : 0,
          max: typeof p.max === 'number' ? p.max : 100
        })),
        code: typeof scene.code === 'string' ? scene.code : "",
        planning: typeof scene.planning === 'string' ? scene.planning : ""
      };

      console.log("Normalized Scene:", normalizedScene);
      return normalizedScene;
    } catch (parseError: any) {
      console.error("Failed to parse or validate AI response:", content, parseError);
      throw new Error(`Technical Failure: ${parseError.message}`);
    }
  } catch (e: any) {
    console.error("Detailed AI Error:", e);
    
    let errorMessage = "An unexpected error occurred.";
    if (e.status === 401) errorMessage = "Invalid API Key. Please check your settings.";
    else if (e.status === 404) errorMessage = "Model not found. Please check the model name.";
    else if (e.message) errorMessage = e.message;

    return { 
      description: `Error: ${errorMessage}`, 
      objects: [], 
      parameters: [] 
    };
  }
}

export async function analyzeSCADCode(scadCode: string): Promise<SceneState> {
  console.log("Analyzing SCAD code for preview generation...");
  
  if (!apiKey) {
    throw new Error("AI_API_KEY is missing.");
  }

  try {
    const messages: any[] = [
      {
        role: "system",
        content: `你是一个 OpenSCAD 分析专家。用户会提供一段 OpenSCAD 代码。
你的任务是：
1. 提取或推断模型的名称和描述。
2. 将 OpenSCAD 的复杂几何结构简化为基于基础几何体（box, cylinder, sphere, torus, cone）的 objects 数组，以便在 Web 端进行 3D 预览。
3. 提取代码中的关键变量作为 parameters，并与 objects 的 scale 或 position 关联。
4. 识别第三方库（如 BOSL2, NopSCADlib）的组件调用（如 cuboid, screw, fan），并将它们简化预览。
5. 保持代码字段 code 为用户输入的原始代码。

输出格式必须严格遵循 JSON 结构：
{
  "name": "...",
  "description": "...",
  "parameters": [...],
  "objects": [...],
  "code": "原始输入的 SCAD 代码"
}`
      },
      {
        role: "user",
        content: `请分析以下 OpenSCAD 代码并生成预览 JSON：\n\n${scadCode}`
      }
    ];

    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty AI response.");

    const scene = tryParseJSON(content);
    
    return {
      name: scene.name || "导入的模型",
      description: scene.description || "从 SCAD 代码导入",
      objects: (Array.isArray(scene.objects) ? scene.objects : []).map((obj: any, idx: number) => ({
        id: obj.id || `obj_${idx}`,
        type: obj.type || 'box',
        operation: obj.operation || (idx === 0 ? 'base' : 'add'),
        position: obj.position || [0, 0, 0],
        rotation: obj.rotation || [0, 0, 0],
        scale: obj.scale || [1, 1, 1],
        color: obj.color || '#475569',
        name: obj.name || `物体 ${idx + 1}`
      })),
      parameters: (Array.isArray(scene.parameters) ? scene.parameters : []).map((p: any, idx: number) => ({
        ...p,
        id: p.id || `param_import_${idx}`,
        value: typeof p.value === 'number' ? p.value : 0,
        min: typeof p.min === 'number' ? p.min : 0,
        max: typeof p.max === 'number' ? p.max : 100
      })),
      code: scadCode
    };
  } catch (e: any) {
    console.error("SCAD Analysis Error:", e);
    throw e;
  }
}
