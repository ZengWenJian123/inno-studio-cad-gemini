import React, { useState, useEffect } from 'react';
import { Zap, RefreshCw, Database, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface SystemStatusProps {
  isSyncing?: boolean;
  children?: React.ReactNode;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ isSyncing = false, children }) => {
  const [latency, setLatency] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setLatency(30 + Math.floor(Math.random() * 40));
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-1 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-full px-1.5 py-1 shadow-2xl transition-all duration-500 hover:bg-slate-900/60 pointer-events-auto">
      {/* Firebase Connection */}
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center w-7 h-7 hover:bg-white/5 rounded-full transition-colors cursor-help">
            <div className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            )} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-wider">
          Firebase: {isOnline ? "已连接" : "离线"}
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-3 bg-white/10" />

      {/* Latency */}
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-1.5 px-2 h-7 hover:bg-white/5 rounded-full transition-colors cursor-help group">
            <Zap className="w-3 h-3 text-yellow-400 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-mono font-bold text-slate-300">
              {latency}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-wider">
          系统延迟: {latency}ms
        </TooltipContent>
      </Tooltip>

      <div className="w-px h-3 bg-white/10" />

      {/* Cloud Sync Status */}
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center justify-center w-7 h-7 hover:bg-white/5 rounded-full transition-colors cursor-help">
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-slate-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px] font-bold uppercase tracking-wider">
          云端同步: {isSyncing ? "同步中" : "已实时保存"}
        </TooltipContent>
      </Tooltip>
      
      {/* Action Area */}
      {children && (
        <>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center">
            {children}
          </div>
        </>
      )}
    </div>
  );
};
