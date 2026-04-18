import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Code2, Import, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SceneState } from '../types';
import { fastParseScad } from '../lib/scadUtils';

interface ImportSCADModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (scene: SceneState) => void;
}

export const ImportSCADModal: React.FC<ImportSCADModalProps> = ({ isOpen, onClose, onImport }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scadCode, setScadCode] = useState('');

  const handleImport = async () => {
    if (!scadCode.trim()) {
      toast.error('请输入 OpenSCAD 代码。');
      return;
    }
    
    try {
      // Use local fast parser for instant feedback
      const scene = fastParseScad(scadCode);
      onImport(scene);
      toast.success('成功导入 SCAD 模型！');
      onClose();
      setScadCode('');
    } catch (error: any) {
      console.error('Import failed:', error);
      toast.error('处理 SCAD 代码失败。');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-slate-900 border-slate-800 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Import className="w-5 h-5 text-blue-500" />
            导入 OpenSCAD 代码
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            在下方粘贴您的 OpenSCAD 代码。我们的 AI 将对其进行分析，以生成适用于 Web 的 3D 预览和参数化控制。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="relative group">
            <div className="absolute top-3 left-3 flex items-center gap-2 text-slate-600 group-focus-within:text-blue-500 transition-colors pointer-events-none">
              <Code2 className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-widest font-mono">SCAD_SOURCE</span>
            </div>
            <textarea
              value={scadCode}
              onChange={(e) => setScadCode(e.target.value)}
              placeholder="include <BOSL2/std.scad>\n\nmodule my_part() {\n  cuboid([50, 50, 10], rounding=2);\n}\n\nmy_part();"
              className="w-full h-64 bg-slate-950 border border-slate-800 rounded-xl p-4 pt-10 text-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none shadow-inner"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              取消
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={isLoading || !scadCode.trim()} 
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2 px-8 min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在分析...
                </>
              ) : (
                <>
                  <Import className="w-4 h-4" />
                  导入模型
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
