import OpenAI from "openai";
import { SceneState, ChatMessage } from "../types";
import { CAD_GENERATION_PROMPT, REQUIREMENT_CLARIFICATION_PROMPT, CODE_ANALYSIS_PROMPT } from "../constants/prompts";

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
        content: CAD_GENERATION_PROMPT
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

export async function clarifyRequirements(prompt: string, history: ChatMessage[] = []): Promise<{ content: string, isReady: boolean, summary?: string }> {
  console.log("Clarifying requirements for prompt:", prompt);
  
  if (!apiKey) {
    return { content: "错误：缺少 AI API Key。请在设置中配置。", isReady: false };
  }

  try {
    const messages: any[] = [
      {
        role: "system",
        content: REQUIREMENT_CLARIFICATION_PROMPT
      }
    ];

    // Add history
    history.slice(-10).forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    messages.push({
      role: "user",
      content: prompt
    });

    const response = await openai.chat.completions.create({
      model: model,
      messages: messages,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty AI response.");

    const res = tryParseJSON(content);
    return {
      content: res.content || "好的，我明白了。",
      isReady: !!res.isReady,
      summary: res.summary
    };
  } catch (e) {
    console.error("Clarification Error:", e);
    return { content: "抱歉，在梳理需求时遇到了点麻烦。", isReady: false };
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
        content: CODE_ANALYSIS_PROMPT
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
