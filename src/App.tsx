/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ParamPanel } from './components/ParamPanel';
import { Viewer } from './components/Viewer';
import { TemplateGallery } from './components/TemplateGallery';
import { AuthModal } from './components/AuthModal';
import { ImportSCADModal } from './components/ImportSCADModal';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { generateCADModel, analyzeSCADCode, clarifyRequirements } from './services/aiService';
import { projectService } from './services/projectService';
import { Project, ChatMessage, SceneState, Template } from './types';
import { TooltipProvider } from './components/ui/tooltip';
import { Button } from './components/ui/button';
import { Plus, Import } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { auth, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { TEMPLATES } from './constants/templates';

const STORAGE_KEY = 'cadam_projects_v1';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>(() => projectService.getLocalProjects());
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [loadingProjectIds, setLoadingProjectIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
  }, []);

  // Sync Projects from Firebase
  useEffect(() => {
    if (user) {
      return projectService.subscribeToProjects(user.uid, (cloudProjects) => {
        setProjects(cloudProjects);
        if (cloudProjects.length > 0 && !currentProjectId) {
          setCurrentProjectId(cloudProjects[0].id);
        }
      });
    } else {
      // Load from local storage when not logged in
      const local = projectService.getLocalProjects();
      setProjects(local);
      if (local.length > 0 && !currentProjectId) {
        setCurrentProjectId(local[0].id);
      }
    }
  }, [user]);

  // Save projects to local storage fallback
  useEffect(() => {
    if (!user) {
      projectService.saveLocalProjects(projects);
    }
  }, [projects, user]);

  const currentProject = projects.find(p => p.id === currentProjectId);
  const lastScene = currentProject?.messages
    .filter(m => m.scene)
    .slice(-1)[0]?.scene;

  const handleNewProject = () => {
    setShowTemplates(true);
    setCurrentProjectId(null);
  };

  const handleSelectTemplate = (template: Template | null) => {
    const welcomeMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: template 
        ? `已为您加载 ${template.name}。您想如何修改它？` 
        : "你好！我是 Adam，你的 INNO Studio 助手。我已为你创建了一个空白画布。你可以描述你想构建的内容，也可以在编辑器选项卡中粘贴 SCAD 代码！",
      scene: template ? {
        ...template.scene,
        parameters: template.scene.parameters?.map(p => ({ ...p, defaultValue: p.value }))
      } : undefined,
      timestamp: Date.now()
    };

    const newProject: Project = {
      id: uuidv4(),
      name: template ? template.name : '开启新创作',
      messages: [welcomeMsg],
      lastUpdated: Date.now(),
      userId: user?.uid
    };

    setProjects([newProject, ...projects]);
    setCurrentProjectId(newProject.id);
    setShowTemplates(false);

    if (user) {
      projectService.saveProjectToFirebase(newProject, user.uid);
    }
  };

  const handleImportSCAD = (scene: SceneState) => {
    const welcomeMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: `我已分析并导入了您的 OpenSCAD 代码。您现在可以使用右侧的参数进行微调，或者直接向我提出修改要求！`,
      scene,
      timestamp: Date.now()
    };

    const newProject: Project = {
      id: uuidv4(),
      name: scene.name || '导入的模型',
      messages: [welcomeMsg],
      lastUpdated: Date.now(),
      userId: user?.uid
    };

    setProjects([newProject, ...projects]);
    setCurrentProjectId(newProject.id);
    setShowTemplates(false);

    if (user) {
      projectService.saveProjectToFirebase(newProject, user.uid);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    
    if (user) {
      await projectService.deleteProjectFromFirebase(id);
    }

    if (currentProjectId === id) {
      setCurrentProjectId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const saveProject = async (project: Project) => {
    if (user) {
      setIsSyncing(true);
      try {
        await projectService.saveProjectToFirebase(project, user.uid);
      } finally {
        setTimeout(() => setIsSyncing(false), 800);
      }
    }
  };

  const handleSendMessage = async (content: string, image?: string, isEngineerMode?: boolean) => {
    if (!currentProjectId || loadingProjectIds.has(currentProjectId)) return;

    const projectId = currentProjectId;
    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      image,
      timestamp: Date.now()
    };

    const updatedProjects = projects.map(p => 
      p.id === projectId 
        ? { ...p, messages: [...p.messages, userMsg], lastUpdated: Date.now() } 
        : p
    );
    
    setProjects(updatedProjects);

    setLoadingProjectIds(prev => new Set(prev).add(projectId));
    try {
      const history = currentProject?.messages || [];

      if (isEngineerMode) {
        const result = await clarifyRequirements(content, history);
        
        const assistantMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: result.content,
          readyToGenerate: result.isReady,
          summary: result.summary,
          timestamp: Date.now()
        };

        const finalProjects = projects.map(p => 
          p.id === projectId 
            ? { ...p, messages: [...p.messages, userMsg, assistantMsg], lastUpdated: Date.now() } 
            : p
        );
        setProjects(finalProjects);

        const updatedProject = finalProjects.find(p => p.id === projectId);
        if (updatedProject) {
          saveProject(updatedProject);
        }
      } else {
        const scene = await generateCADModel(content, history, image);
        
        const assistantMsg: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: scene.description || "这是生成的模型。",
          scene: {
            ...scene,
            parameters: scene.parameters?.map(p => ({ ...p, defaultValue: p.value }))
          },
          timestamp: Date.now()
        };

        const finalProjects = projects.map(p => 
          p.id === projectId 
            ? { 
                ...p, 
                name: p.messages.length <= 1 ? (scene.name || content.slice(0, 30) + (content.length > 30 ? '...' : '')) : p.name,
                messages: [...p.messages, userMsg, assistantMsg], 
                lastUpdated: Date.now() 
              } 
            : p
        );

        setProjects(finalProjects);
        
        const updatedProject = finalProjects.find(p => p.id === projectId);
        if (updatedProject) {
          saveProject(updatedProject);
        }
      }
    } catch (error) {
      console.error("Generation failed:", error);
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `抱歉，生成时遇到了错误: ${error instanceof Error ? error.message : '未知错误'}。`,
        timestamp: Date.now()
      };
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, messages: [...p.messages, errorMsg], lastUpdated: Date.now() } 
          : p
      ));
    } finally {
      setLoadingProjectIds(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

  const handleParamChange = (paramId: string, value: number) => {
    if (!currentProjectId || !lastScene) return;

    const param = lastScene.parameters?.find(p => p.id === paramId);
    if (!param) return;

    const updatedParameters = lastScene.parameters?.map(p => p.id === paramId ? { ...p, value } : p);
    
    let updatedObjects = [...lastScene.objects];
    if (param.targetObjectId && param.targetProperty) {
      updatedObjects = updatedObjects.map(obj => {
        if (obj.id !== param.targetObjectId) return obj;
        
        const newObj = { ...obj };
        const prop = param.targetProperty;
        const currentScale = obj.scale || [1, 1, 1];
        const currentPos = obj.position || [0, 0, 0];
        
        if (prop === 'scale.x') newObj.scale = [value, currentScale[1], currentScale[2]];
        else if (prop === 'scale.y') newObj.scale = [currentScale[0], value, currentScale[2]];
        else if (prop === 'scale.z') newObj.scale = [currentScale[0], currentScale[1], value];
        else if (prop === 'position.x') newObj.position = [value, currentPos[1], currentPos[2]];
        else if (prop === 'position.y') newObj.position = [currentPos[0], value, currentPos[2]];
        else if (prop === 'position.z') newObj.position = [currentPos[0], currentPos[1], value];
        
        return newObj;
      });
    }

    const updatedScene: SceneState = {
      ...lastScene,
      parameters: updatedParameters,
      objects: updatedObjects
    };

    const finalProjects = projects.map(p => {
      if (p.id !== currentProjectId) return p;
      const newMessages = [...p.messages];
      const lastMsgIndex = newMessages.map(m => !!m.scene).lastIndexOf(true);
      if (lastMsgIndex !== -1) {
        newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], scene: updatedScene };
      }
      return { ...p, messages: newMessages, lastUpdated: Date.now() };
    });

    setProjects(finalProjects);
    
    const updatedProject = finalProjects.find(p => p.id === currentProjectId);
    if (updatedProject) {
      saveProject(updatedProject);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!lastScene || !user) {
      if (!user) {
        setIsAuthModalOpen(true);
        toast.error("Please login to save designs as templates.");
      }
      return;
    }

    const toastId = toast.loading("正在保存到社区模板...");
    try {
      const templateData: Omit<Template, 'id' | 'createdAt'> = {
        name: lastScene.name || currentProject?.name || "社区设计",
        description: lastScene.description || "用户贡献的 3D 模型模板。",
        scene: lastScene,
        thumbnail: "✨",
        isPublic: true,
        userId: user.uid
      };

      await projectService.saveAsTemplate(templateData);
      toast.success("设计已保存到社区模板！", { id: toastId });
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("保存模板失败。", { id: toastId });
    }
  };

  const handleResetParameters = () => {
    if (!currentProjectId || !lastScene || !lastScene.parameters) return;

    // Reset all parameters to their default values
    const resetParameters = lastScene.parameters.map(p => ({
      ...p,
      value: p.defaultValue ?? p.value
    }));

    // Update objects based on reset parameters
    let updatedObjects = [...lastScene.objects];
    resetParameters.forEach(param => {
      if (param.targetObjectId && param.targetProperty) {
        updatedObjects = updatedObjects.map(obj => {
          if (obj.id !== param.targetObjectId) return obj;
          
          const newObj = { ...obj };
          const prop = param.targetProperty;
          const currentScale = obj.scale || [1, 1, 1];
          const currentPos = obj.position || [0, 0, 0];
          const value = param.value;
          
          if (prop === 'scale.x') newObj.scale = [value, currentScale[1], currentScale[2]];
          else if (prop === 'scale.y') newObj.scale = [currentScale[0], value, currentScale[2]];
          else if (prop === 'scale.z') newObj.scale = [currentScale[0], currentScale[1], value];
          else if (prop === 'position.x') newObj.position = [value, currentPos[1], currentPos[2]];
          else if (prop === 'position.y') newObj.position = [currentPos[0], value, currentPos[2]];
          else if (prop === 'position.z') newObj.position = [currentPos[0], currentPos[1], value];
          
          return newObj;
        });
      }
    });

    const updatedScene: SceneState = {
      ...lastScene,
      parameters: resetParameters,
      objects: updatedObjects
    };

    const finalProjects = projects.map(p => {
      if (p.id !== currentProjectId) return p;
      const newMessages = [...p.messages];
      const lastMsgIndex = newMessages.map(m => !!m.scene).lastIndexOf(true);
      if (lastMsgIndex !== -1) {
        newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], scene: updatedScene };
      }
      return { ...p, messages: newMessages, lastUpdated: Date.now() };
    });

    setProjects(finalProjects);
    
    const updatedProject = finalProjects.find(p => p.id === currentProjectId);
    if (updatedProject) {
      saveProject(updatedProject);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
        <Sidebar 
          projects={projects}
          currentProjectId={currentProjectId}
          loadingProjectIds={loadingProjectIds}
          onSelectProject={(id) => {
            setCurrentProjectId(id);
            setShowTemplates(false);
          }}
          onNewProject={handleNewProject}
          onDeleteProject={handleDeleteProject}
          user={user}
          onLogin={() => setIsAuthModalOpen(true)}
          onLogout={logout}
        />

        <div className="flex-1 flex overflow-hidden">
          {showTemplates ? (
            <div className="flex-1 overflow-y-auto bg-slate-950 pt-12">
              <div className="max-w-4xl mx-auto px-6 mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">开启新创作</h1>
                  <p className="text-slate-400">选择一个蓝图，从零开始，或导入已有代码。</p>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsImportModalOpen(true)} 
                    className="border-slate-800 text-slate-300 hover:bg-slate-900 gap-2 h-11 px-6 rounded-xl"
                  >
                    <Import className="w-4 h-4 text-blue-400" />
                    导入 SCAD
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => handleSelectTemplate(null)} 
                    className="border-slate-800 text-slate-300 hover:bg-slate-900 gap-2 h-11 px-6 rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                    空白画板
                  </Button>
                </div>
              </div>
              <TemplateGallery 
                onSelectTemplate={handleSelectTemplate} 
                user={user}
              />
            </div>
          ) : currentProjectId ? (
            <>
              <div className="w-[400px] flex-shrink-0 h-full overflow-hidden border-r border-slate-800">
                <ChatPanel 
                  messages={currentProject?.messages || []}
                  onSendMessage={handleSendMessage}
                  isLoading={loadingProjectIds.has(currentProjectId)}
                />
              </div>

              <div className="flex-1 flex flex-col p-6 gap-6 bg-slate-950">
                <div className="flex-1 min-h-0">
                  <Viewer 
                    objects={lastScene?.objects || []} 
                    projectName={currentProject?.name}
                    code={lastScene?.code}
                    isSyncing={isSyncing}
                    onSaveAsTemplate={handleSaveAsTemplate}
                  />
                </div>
              </div>

              <div className="w-80 flex-shrink-0 p-6 pl-0">
                <ParamPanel 
                  parameters={lastScene?.parameters || []}
                  onParamChange={handleParamChange}
                  onReset={handleResetParameters}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <Box className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white">欢迎来到 INNO 设计站</h2>
                <p className="text-slate-500 max-w-xs mx-auto">
                  使用自然语言设计 3D 模型，并在您的设备间同步。
                </p>
              </div>
              <Button onClick={handleNewProject} className="bg-blue-600 hover:bg-blue-500 text-white px-8 h-11 rounded-xl shadow-lg shadow-blue-500/20">
                开启新创作
              </Button>
            </div>
          )}
        </div>
      </div>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <ImportSCADModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        onImport={handleImportSCAD} 
      />
      <Toaster position="top-right" theme="dark" />
    </TooltipProvider>
  );
}

function Box(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
