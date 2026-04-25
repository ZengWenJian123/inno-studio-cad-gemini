export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane';

export interface CADObject {
  id: string;
  type: PrimitiveType;
  operation?: 'base' | 'add' | 'subtract' | 'intersect';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  name: string;
  opacity?: number;
}

export interface Parameter {
  id: string;
  name: string;
  value: number;
  defaultValue?: number;
  min: number;
  max: number;
  unit: string;
  targetObjectId?: string;
  targetProperty?: 'scale.x' | 'scale.y' | 'scale.z' | 'position.x' | 'position.y' | 'position.z' | 'radius' | 'width' | 'height' | 'depth';
}

export interface SceneState {
  name?: string;
  objects: CADObject[];
  description: string;
  parameters?: Parameter[];
  code?: string;
  planning?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  scene?: SceneState;
  readyToGenerate?: boolean;
  summary?: string;
  timestamp: number;
}

export type AIProvider = 'gemini' | 'deepseek';

export interface AIConfig {
  provider: AIProvider;
  model: string;
}

export interface Project {
  id: string;
  userId?: string;
  name: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  scene: SceneState;
  thumbnail: string;
  isPublic?: boolean;
  userId?: string;
  createdAt?: number;
}
