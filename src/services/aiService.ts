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

export async function generateCADModel(prompt: string, history: ChatMessage[] = [], image?: string): Promise<SceneState> {
  console.log("Generating CAD model for prompt:", prompt);
  console.log("Using model:", model);
  console.log("Base URL:", baseURL);
  
  if (!apiKey) {
    console.error("AI_API_KEY is missing! Please set it in the Secrets panel.");
    return { description: "Error: AI API Key is missing. Please configure it in the settings.", objects: [], parameters: [] };
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

【高级建模技能 (Advanced Skills): BOSL2 标准库】
你的渲染环境已内置并完全支持 BOSL2 (Belfry OpenScad Library v2) 库。当生成 OpenSCAD 代码（code 字段）时，如果用户要求生成复杂的工业零件（如齿轮、螺纹、带倒角/圆角的复杂外壳、标准紧固件），你【必须】优先使用 BOSL2 库。
1. 在 code 字段的最顶部写入：\`include <BOSL2/std.scad>\`
2. 倒角与圆角：直接使用 BOSL2 的 \`cuboid()\`, \`cyl()\`, \`prismoid()\` 并配合 \`rounding\` 或 \`chamfer\` 参数。
3. 螺纹与齿轮：使用 \`include <BOSL2/threading.scad>\` 或 \`include <BOSL2/gears.scad>\`。

【OpenSCAD 建模绝对准则】
1. 模块化编程 (Modular Design)：如果模型包含多个独立的功能部件，你必须将它们分别封装为独立的 \`module component_name() { ... }\`。然后在代码最底部的 \`Main Assembly\` 部分将它们进行 translate 并组装。

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
      let scene = JSON.parse(content) as any;
      
      // Handle cases where the AI wraps the response in a "scene" or "data" key
      if (scene.scene && typeof scene.scene === 'object') {
        scene = scene.scene;
      } else if (scene.data && typeof scene.data === 'object') {
        scene = scene.data;
      }

      // Normalize structure
      const normalizedScene: SceneState = {
        name: scene.name,
        description: scene.description || "Generated CAD model",
        objects: Array.isArray(scene.objects) ? scene.objects : [],
        parameters: Array.isArray(scene.parameters) ? scene.parameters : []
      };

      console.log("Normalized Scene:", normalizedScene);
      return normalizedScene;
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      throw new Error("The AI response was not valid JSON. Please try again.");
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
