import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage } from '../types';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, Send, User, Bot, Box, ChevronDown, ChevronRight, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string, image?: string) => void;
  isLoading: boolean;
}

const CodeBlock = ({ code }: { code: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-2 w-full max-w-sm rounded-lg overflow-hidden border border-slate-700 bg-slate-900/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
      >
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        OpenSCAD 快照
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-[#0d1117] overflow-x-auto">
              <pre className="text-[11px] leading-relaxed font-mono text-slate-300">
                <code>{code}</code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = React.useState('');
  const [selectedImage, setSelectedImage] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;
    onSendMessage(input, selectedImage);
    setInput('');
    setSelectedImage(undefined);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/30 border-r border-slate-800">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6 max-w-2xl mx-auto">
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg",
                  msg.role === 'user' ? "bg-blue-600" : "bg-slate-800 border border-slate-700"
                )}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-blue-400" />}
                </div>
                <div className={cn(
                  "flex flex-col gap-2 max-w-[85%]",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                  )}>
                    {msg.image && (
                      <img 
                        src={msg.image} 
                        alt="User uploaded reference" 
                        className="max-w-full rounded-lg mb-2 max-h-48 object-contain"
                      />
                    )}
                    {msg.content}
                  </div>
                  {msg.scene?.code && <CodeBlock code={msg.scene.code} />}
                  {msg.scene && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/50 border border-slate-800 rounded-full">
                      <Box className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        Model Version {messages.filter(m => m.scene && m.timestamp <= msg.timestamp).length}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="flex gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              </div>
              <div className="bg-slate-800/50 border border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500/50 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-blue-500/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-blue-500/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto flex flex-col gap-2">
          {selectedImage && (
            <div className="relative inline-block w-24 h-24 rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
              <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setSelectedImage(undefined)}
                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="relative flex items-center">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute left-1.5 h-9 w-9 text-slate-400 hover:text-slate-200 hover:bg-slate-800 z-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Input
              placeholder="Keep iterating with CADAM..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="bg-slate-950 border-slate-800 focus-visible:ring-blue-500 text-slate-200 h-12 pl-12 pr-12 rounded-xl w-full"
              disabled={isLoading}
            />
            <Button 
              type="submit"
              size="icon"
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className="absolute right-1.5 h-9 w-9 bg-blue-600 hover:bg-blue-500 text-white transition-all rounded-lg shadow-lg shadow-blue-500/20 z-10"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
