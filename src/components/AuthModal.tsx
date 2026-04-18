import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { LogIn, UserPlus, Chrome } from 'lucide-react';
import { loginWithUsername, registerWithUsername, signInWithGoogle } from '../lib/firebase';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Google 登录成功');
      onClose();
    } catch (error: any) {
      if (error.code !== 'auth/popup-blocked' && error.code !== 'auth/cancelled-popup-request') {
        toast.error('Google 登录失败');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    try {
      await loginWithUsername(username, password);
      toast.success('欢迎回来！');
      onClose();
    } catch (error: any) {
      toast.error(error.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    if (password.length < 6) {
      toast.error('密码至少需要 6 个字符');
      return;
    }

    setIsLoading(true);
    try {
      await registerWithUsername(username, password);
      toast.success('账户创建成功！');
      onClose();
    } catch (error: any) {
      toast.error(error.message || '注册失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-slate-900 border-slate-800 text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">账户访问</DialogTitle>
          <DialogDescription className="text-slate-400">
            登录以在内部测试期间跨设备同步您的模型。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800">
            <TabsTrigger value="login" className="data-[state=active]:bg-slate-700">登录</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-slate-700">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <form onSubmit={handleUsernameLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">用户名或邮箱</Label>
                <Input 
                  id="login-username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="测试员" 
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <Input 
                  id="login-password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2">
                <LogIn className="w-4 h-4" />
                登录
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-4">
            <form onSubmit={handleUsernameRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-username">选择用户名</Label>
                <Input 
                  id="reg-username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="测试员" 
                  className="bg-slate-950 border-slate-800"
                />
                <p className="text-[10px] text-slate-500 italic">这将作为您的显示名称。</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">密码</Label>
                <Input 
                  id="reg-password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-slate-100 hover:bg-white text-slate-900 gap-2">
                <UserPlus className="w-4 h-4" />
                创建账户
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-500">或继续使用</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={handleGoogleLogin} 
          disabled={isLoading}
          className="w-full border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200 gap-2"
        >
          <Chrome className="w-4 h-4 text-blue-400" />
          Google 账户
        </Button>
      </DialogContent>
    </Dialog>
  );
};
