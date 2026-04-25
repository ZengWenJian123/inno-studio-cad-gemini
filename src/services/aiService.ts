import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { SceneState, ChatMessage, AIProvider, AIConfig } from "../types";
import { CAD_GENERATION_PROMPT, REQUIREMENT_CLARIFICATION_PROMPT, CODE_ANALYSIS_PROMPT } from "../constants/prompts";

// Environment Keys
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

// Default Config
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: (process.env.VITE_DEFAULT_AI_PROVIDER as AIProvider) || 'gemini',
  model: process.env.VITE_DEFAULT_AI_MODEL || 'gemini-3.1-pro-preview'
};

// Internal Client State
let geminiClient: GoogleGenAI | null = null;
let deepseekClient: OpenAI | null = null;

function getGeminiClient() {
  if (!geminiClient && GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return geminiClient;
}

function getDeepseekClient() {
  if (!deepseekClient && DEEPSEEK_API_KEY) {
    deepseekClient = new OpenAI({
      apiKey: DEEPSEEK_API_KEY,
      baseURL: DEEPSEEK_BASE_URL,
      dangerouslyAllowBrowser: true
    });
  }
  return deepseekClient;
}

/**
 * Robustly attempts to parse JSON from AI response, handling markdown blocks and surrounding text.
 */
function tryParseJSON(content: string): any {
  let cleaned = content.trim();
  
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n/i, '').replace(/\n```$/i, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
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

export async function generateCADModel(
  prompt: string, 
  history: ChatMessage[] = [], 
  image?: string,
  config: AIConfig = DEFAULT_AI_CONFIG
): Promise<SceneState> {
  console.log(`Generating CAD model using ${config.provider}:${config.model}`);
  
  if (config.provider === 'gemini') {
    return generateWithGemini(prompt, history, image, config.model);
  } else {
    return generateWithDeepseek(prompt, history, image, config.model);
  }
}

async function generateWithGemini(prompt: string, history: ChatMessage[], image: string | undefined, modelName: string): Promise<SceneState> {
  const contents: any[] = [];
  history.forEach(msg => {
    const textContent = msg.role === 'assistant' && msg.scene 
      ? `${msg.content}\n\nJSON State: ${JSON.stringify(msg.scene)}`
      : msg.content;
    
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts: any[] = [{ text: textContent }];
    
    if (msg.image && msg.role === 'user') {
      const base64Data = msg.image.split(',')[1];
      if (base64Data) {
        const mimeType = msg.image.split(';')[0].split(':')[1];
        parts.push({
          inlineData: { data: base64Data, mimeType: mimeType || "image/png" }
        });
      }
    }
    contents.push({ role, parts });
  });

  const currentParts: any[] = [{ text: prompt }];
  if (image) {
    const base64Data = image.split(',')[1];
    if (base64Data) {
      const mimeType = image.split(';')[0].split(':')[1];
      currentParts.push({
        inlineData: { data: base64Data, mimeType: mimeType || "image/png" }
      });
    }
  }
  contents.push({ role: "user", parts: currentParts });

  const response = await fetch("/api/ai/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      model: modelName,
      systemInstruction: CAD_GENERATION_PROMPT
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  const content = result.text;
  if (!content) throw new Error("The AI returned an empty response.");
  return normalizeSceneResponse(tryParseJSON(content));
}

async function generateWithDeepseek(prompt: string, history: ChatMessage[], image: string | undefined, modelName: string): Promise<SceneState> {
  const messages: any[] = [
    { role: "system", content: CAD_GENERATION_PROMPT }
  ];

  history.forEach(msg => {
    const textContent = msg.role === 'assistant' && msg.scene 
      ? `${msg.content}\n\nJSON State: ${JSON.stringify(msg.scene)}`
      : msg.content;
    
    messages.push({ role: msg.role, content: textContent });
  });

  messages.push({ role: "user", content: prompt });

  const response = await fetch("/api/ai/deepseek", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelName,
      messages,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;
  if (!content) throw new Error("The AI returned an empty response.");
  return normalizeSceneResponse(tryParseJSON(content));
}

function normalizeSceneResponse(scene: any): SceneState {
  if (scene.scene && typeof scene.scene === 'object') scene = scene.scene;
  else if (scene.data && typeof scene.data === 'object') scene = scene.data;

  if (!scene.objects || !Array.isArray(scene.objects)) {
    throw new Error("Model generated text but missed the 3D geometry structure.");
  }
  
  const parameters: any[] = [];
  const seenParamIds = new Set<string>();
  const rawParams = Array.isArray(scene.parameters) ? scene.parameters : [];

  rawParams.forEach((p: any, idx: number) => {
    let id = String(p.id || `param_${idx}`).trim();
    if (!id || seenParamIds.has(id)) {
      id = `${id || 'param'}_${Date.now()}_${idx}`;
    }
    seenParamIds.add(id);

    parameters.push({
      ...p,
      id,
      name: p.name || id,
      unit: p.unit || "",
      value: typeof p.value === 'number' ? p.value : 0,
      min: typeof p.min === 'number' ? p.min : 0,
      max: typeof p.max === 'number' ? p.max : 100
    });
  });

  const objects: any[] = [];
  const seenObjIds = new Set<string>();
  const rawObjects = Array.isArray(scene.objects) ? scene.objects : [];

  rawObjects.forEach((obj: any, idx: number) => {
    let id = String(obj.id || `obj_${idx}`).trim();
    if (!id || seenObjIds.has(id)) {
      id = `${id || 'obj'}_${Date.now()}_${idx}`;
    }
    seenObjIds.add(id);

    objects.push({
      id,
      type: (['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'].includes(obj.type) ? obj.type : 'box'),
      operation: (['base', 'add', 'subtract', 'intersect'].includes(obj.operation) ? obj.operation : (idx === 0 ? 'base' : 'add')),
      position: Array.isArray(obj.position) && obj.position.length === 3 ? obj.position : [0, 0, 0],
      rotation: Array.isArray(obj.rotation) && obj.rotation.length === 3 ? obj.rotation.map((r: any) => typeof r === 'number' ? r : 0) : [0, 0, 0],
      scale: Array.isArray(obj.scale) && obj.scale.length === 3 ? obj.scale.map((s: any) => typeof s === 'number' ? s : 1) : [1, 1, 1],
      color: (typeof obj.color === 'string' && obj.color.startsWith('#')) ? obj.color : '#475569',
      name: obj.name || `部件 ${idx + 1}`,
      opacity: typeof obj.opacity === 'number' ? obj.opacity : 1
    });
  });

  return {
    name: scene.name || "新创作",
    description: scene.description || "生成的 CAD 模型",
    objects,
    parameters,
    code: typeof scene.code === 'string' ? scene.code : "",
    planning: typeof scene.planning === 'string' ? scene.planning : ""
  };
}

export async function clarifyRequirements(
  prompt: string, 
  history: ChatMessage[] = [],
  config: AIConfig = DEFAULT_AI_CONFIG
): Promise<{ content: string, isReady: boolean, summary?: string }> {
  console.log(`Clarifying requirements using ${config.provider}:${config.model}`);
  
  if (config.provider === 'gemini') {
    const contents: any[] = [];
    history.slice(-10).forEach(msg => {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      contents.push({ role, parts: [{ text: msg.content }] });
    });
    contents.push({ role: "user", parts: [{ text: prompt }] });

    const response = await fetch("/api/ai/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        model: config.model,
        systemInstruction: REQUIREMENT_CLARIFICATION_PROMPT
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const content = result.text;
    if (!content) throw new Error("Empty AI response.");
    const res = tryParseJSON(content);
    return {
      content: res.content || "好的，我明白了。",
      isReady: !!res.isReady,
      summary: res.summary
    };
  } else {
    const messages: any[] = [
      { role: "system", content: REQUIREMENT_CLARIFICATION_PROMPT }
    ];
    history.slice(-10).forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });
    messages.push({ role: "user", content: prompt });

    const response = await fetch("/api/ai/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    if (!content) throw new Error("Empty AI response.");
    const res = tryParseJSON(content);
    return {
      content: res.content || "好的，我明白了。",
      isReady: !!res.isReady,
      summary: res.summary
    };
  }
}

export async function analyzeSCADCode(
  scadCode: string,
  config: AIConfig = DEFAULT_AI_CONFIG
): Promise<SceneState> {
  console.log(`Analyzing SCAD using ${config.provider}:${config.model}`);
  
  const userPrompt = `请分析以下 OpenSCAD 代码并生成预览 JSON：\n\n${scadCode}`;

  if (config.provider === 'gemini') {
    const response = await fetch("/api/ai/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        model: config.model,
        systemInstruction: CODE_ANALYSIS_PROMPT
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const content = result.text;
    if (!content) throw new Error("Empty AI response.");
    return normalizeSceneResponse(tryParseJSON(content));
  } else {
    const response = await fetch("/api/ai/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: CODE_ANALYSIS_PROMPT },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    if (!content) throw new Error("Empty AI response.");
    return normalizeSceneResponse(tryParseJSON(content));
  }
}
