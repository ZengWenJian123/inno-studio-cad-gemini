import React from 'react';
import { Project } from '../types';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Plus, LayoutGrid, MessageSquare, Trash2, LogOut, LogIn, User, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User as FirebaseUser } from 'firebase/auth';

interface SidebarProps {
  projects: Project[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  user: FirebaseUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  projects, 
  currentProjectId, 
  onSelectProject, 
  onNewProject,
  onDeleteProject,
  user,
  onLogin,
  onLogout
}) => {
  return (
    <div className="w-64 h-full bg-slate-950 border-r border-slate-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white">INNO 设计站</h1>
        </div>
        
        <Button 
          onClick={onNewProject}
          className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 justify-start gap-2 h-10 rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          开启新创作
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-1">
          <div className="px-3 py-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">我的作品</p>
          </div>
          {projects.map((project) => (
            <div 
              key={project.id}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer",
                currentProjectId === project.id 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
              onClick={() => onSelectProject(project.id)}
            >
              <MessageSquare className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium truncate flex-1">{project.name}</span>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProject(project.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="py-12 text-center px-4">
              <p className="text-[11px] text-slate-600 italic leading-relaxed">
                您的 3D 作品将显示在这里
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-800 mt-auto space-y-4">
        {!process.env.AI_API_KEY && (
          <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-[10px] text-amber-500 font-medium leading-tight">
              ⚠️ 缺少 AI API Key。请在 Secrets 面板中设置。
            </p>
          </div>
        )}
        
        {user ? (
          // ... user profile UI ...
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 border border-slate-800">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user.displayName || '设计师'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-red-400"
              onClick={onLogout}
              title="登出"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button 
              onClick={onLogin}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2 rounded-lg h-10 shadow-lg shadow-blue-500/20"
            >
              <LogIn className="w-4 h-4" />
              登录以同步
            </Button>
            <p className="text-[10px] text-slate-500 text-center px-2">
              内部调试模式
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
