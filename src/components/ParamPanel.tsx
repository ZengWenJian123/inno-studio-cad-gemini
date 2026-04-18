import React from 'react';
import { Parameter } from '../types';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

interface ParamPanelProps {
  parameters: Parameter[];
  onParamChange: (id: string, value: number) => void;
  onReset: () => void;
}

export const ParamPanel: React.FC<ParamPanelProps> = ({ parameters, onParamChange, onReset }) => {
  return (
    <Card className="h-full bg-slate-900 border-slate-800 flex flex-col overflow-hidden shadow-2xl">
      <CardHeader className="pb-4 border-b border-slate-800 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-white tracking-tight uppercase">参数设置</CardTitle>
        <Button variant="ghost" size="icon" onClick={onReset} className="h-8 w-8 text-slate-400 hover:text-white">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="p-4 space-y-6">
          {parameters.map((param) => {
            let min = Number(param.min);
            let max = Number(param.max);
            let val = Number(param.value);

            if (isNaN(min)) min = 0;
            if (isNaN(max)) max = 100;
            if (isNaN(val)) val = 0;

            // 1. Fix inverted or zero-range bounds from AI
            if (min >= max) {
              const center = min !== 0 ? min : (val !== 0 ? val : 10);
              min = center > 0 ? center * 0.2 : center * 2.0;
              max = center > 0 ? center * 2.0 : center * 0.2;
              if (min >= max) { min = 0; max = 100; }
            }

            // 2. Expand bounds by 50% to give users room to drag (prevents being stuck at edges)
            let range = max - min;
            
            // Ensure a minimum range so the slider can actually move with step=0.1
            if (range < 1) {
              const center = (min + max) / 2;
              min = center - 0.5;
              max = center + 0.5;
              range = 1;
            }

            let displayMin = min - range * 0.5;
            let displayMax = max + range * 0.5;

            // 3. Prevent negative values for likely physical dimensions
            if (min >= 0 && displayMin < 0) {
              displayMin = 0;
            }

            // 4. Ensure current value is within display bounds
            if (val < displayMin) displayMin = val > 0 ? val * 0.5 : val - 10;
            if (val > displayMax) displayMax = val > 0 ? val * 1.5 : val + 10;

            // Clamp value just in case
            val = Math.min(Math.max(val, displayMin), displayMax);

            return (
              <div key={param.id} className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-medium text-slate-300">{param.name}</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-blue-400">{val.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{param.unit}</span>
                  </div>
                </div>
                <Slider
                  value={[val]}
                  min={displayMin}
                  max={displayMax}
                  step={0.1}
                  onValueChange={(vals) => {
                    console.log("Slider onValueChange:", vals);
                    const newValue = Array.isArray(vals) ? vals[0] : vals;
                    if (typeof newValue === 'number' && !isNaN(newValue)) {
                      onParamChange(param.id, newValue);
                    }
                  }}
                  className="py-2"
                />
              </div>
            );
          })}
          {parameters.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-xs text-slate-500 italic">未发现可调节参数</p>
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
