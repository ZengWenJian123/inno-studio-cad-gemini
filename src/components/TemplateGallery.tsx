import React, { useEffect, useState } from 'react';
import { TEMPLATES } from '../constants/templates';
import { Template } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { LayoutGrid, Sparkles, Loader2, Code2, Trash2, Edit3, Search, Filter, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectService } from '../services/projectService';
import { User } from 'firebase/auth';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
  user: User | null;
}

type TabType = 'all' | 'community' | 'mine';

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ onSelectTemplate, user }) => {
  const [dynamicTemplates, setDynamicTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Confirmation State
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  
  // Edit State
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const publicTemplates = await projectService.getPublicTemplates();
      setDynamicTemplates(publicTemplates);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    const id = deletingTemplate.id;

    try {
      await projectService.deleteTemplate(id);
      toast.success('模板已删除');
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (error) {
      toast.error('删除失败');
      console.error("Delete error:", error);
    }
  };

  const startDelete = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    setDeletingTemplate(template);
  };

  const startEdit = (e: React.MouseEvent, template: Template) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setEditName(template.name);
    setEditDesc(template.description);
  };

  const handleUpdate = async () => {
    if (!editingTemplate) return;
    try {
      await projectService.updateTemplate(editingTemplate.id, {
        name: editName,
        description: editDesc
      });
      toast.success('模板已更新');
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error) {
      toast.error('更新失败');
    }
  };

  const allTemplates = [...TEMPLATES, ...dynamicTemplates];
  
  const filteredTemplates = allTemplates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'community') return !!t.userId;
    if (activeTab === 'mine') return t.userId === user?.uid;
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-blue-500 mb-2">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">库 / 模型馆</span>
          </div>
          <h2 className="text-4xl font-bold text-white tracking-tight">设计蓝图库</h2>
          <p className="text-slate-400 text-lg max-w-2xl">
            探索经过验证的高精度参数化模板，或者管理您自己的 3D 设计资产。
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <Input 
              placeholder="搜索模型内容..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64 bg-slate-900/50 border-slate-800 rounded-xl focus:ring-blue-500 h-10"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg border border-slate-800">
          {(['all', 'community', 'mine'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider",
                activeTab === tab 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              )}
            >
              {tab === 'all' ? '全部' : tab === 'community' ? '社区' : '我的'}
            </button>
          ))}
        </div>
        
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>正在同步数据...</span>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTemplates.map((template, index) => {
          const isOwner = user && template.userId === user.uid;
          
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            >
              <Card 
                className="bg-slate-900/30 border-slate-800/60 hover:border-blue-500/40 hover:bg-slate-900/60 transition-all cursor-pointer group h-full flex flex-col relative overflow-hidden backdrop-blur-sm shadow-xl" 
                onClick={() => onSelectTemplate(template)}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/0 group-hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                
                <CardHeader className="pb-4 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform shadow-2xl shadow-black/50 border border-slate-700/30">
                      {template.thumbnail}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 ">
                      <div className="flex gap-1.5 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isOwner && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-blue-400 rounded-lg"
                              onClick={(e) => startEdit(e, template)}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-lg"
                              onClick={(e) => startDelete(e, template)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 flex items-center gap-1 uppercase tracking-tight">
                        <Code2 className="w-2.5 h-2.5" />
                        SCAD 导出就绪
                      </div>
                      {template.userId && (
                        <div className={cn(
                          "px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight",
                          isOwner 
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                        )}>
                          {isOwner ? '我的作品' : '社区'}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <CardTitle className="text-white text-xl mb-2 font-bold group-hover:text-blue-400 transition-colors">
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">
                    {template.description}
                  </CardDescription>
                  
                  <div className="flex gap-2 flex-wrap mt-auto">
                    {template.scene.parameters?.slice(0, 3).map(p => (
                      <span key={p.id} className="text-[10px] font-mono text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/30 uppercase">
                        {p.name}
                      </span>
                    ))}
                    {template.scene.parameters && template.scene.parameters.length > 3 && (
                      <span className="text-[10px] font-mono text-slate-600">
                        +{template.scene.parameters.length - 3} 更多
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-6 px-6">
                  <Button 
                    variant="secondary" 
                    className="w-full bg-slate-800/80 hover:bg-blue-600 hover:text-white text-slate-300 gap-2 border border-slate-700/50 transition-all font-bold shadow-lg group/btn"
                  >
                    <Sparkles className="w-4 h-4 group-hover/btn:rotate-12 transition-transform" />
                    初始化设计
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && !loading && (
        <div className="py-24 text-center border-2 border-dashed border-slate-800 rounded-3xl">
          <LayoutGrid className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">未找到相关模型</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">
            试试不同的关键词，或者在“我的”选项卡中查看您创建的模板。
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-400" />
              编辑模板信息
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-400">模板名称</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-slate-950 border-slate-800 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-400">详细描述</Label>
              <Textarea
                id="description"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="bg-slate-950 border-slate-800 focus:ring-blue-500 h-32 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setEditingTemplate(null)}
              className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              取消
            </Button>
            <Button 
              onClick={handleUpdate}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6"
            >
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <DialogContent className="sm:max-w-[400px] bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              确认删除
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-400">
              您确定要删除模板 <span className="text-white font-bold">"{deletingTemplate?.name}"</span> 吗？
            </p>
            <p className="text-slate-500 text-sm mt-2">
              此操作不可撤销，该模板将从库中永久移除。
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeletingTemplate(null)}
              className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              取消
            </Button>
            <Button 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-500 text-white px-6 shadow-lg shadow-red-500/20"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
