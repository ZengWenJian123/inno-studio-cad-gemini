import React from 'react';
import { AIConfig, AIProvider } from '../types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Cpu, Sparkles } from 'lucide-react';

interface ModelSelectorProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
}

const MODELS: Record<AIProvider, { name: string, models: { id: string, name: string }[] }> = {
  gemini: {
    name: 'Google Gemini',
    models: [
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' },
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash (Internal)' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro (Internal)' }
    ]
  }
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({ config, onChange }) => {
  const handleProviderChange = (provider: AIProvider) => {
    onChange({
      provider,
      model: MODELS[provider].models[0].id
    });
  };

  const handleModelChange = (model: string) => {
    onChange({
      ...config,
      model
    });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <Sparkles className="w-3 h-3 text-blue-500" />
          AI 引擎提供商
        </label>
        <Select value={config.provider} onValueChange={(v) => handleProviderChange(v as AIProvider)}>
          <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200 h-9 text-xs focus:ring-1 focus:ring-blue-500/50">
            <SelectValue placeholder="选择提供商" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
            <SelectItem value="gemini">Google Gemini</SelectItem>
            <SelectItem value="deepseek">DeepSeek (OpenAI API)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 px-1">
          <Cpu className="w-3 h-3 text-purple-500" />
          模型选择
        </label>
        <Select value={config.model} onValueChange={handleModelChange}>
          <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-200 h-9 text-xs focus:ring-1 focus:ring-blue-500/50">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
            {MODELS[config.provider].models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
