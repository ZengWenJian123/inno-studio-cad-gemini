/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ParamPanel } from './components/ParamPanel';
import { Viewer } from './components/Viewer';
import { generateCADModel } from './services/aiService';
import { Project, ChatMessage, SceneState, Parameter } from './types';
import { TooltipProvider } from './components/ui/tooltip';
import { Button } from './components/ui/button';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'cadam_projects_v1';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load projects", e);
      }
    }
    return [];
  });
  
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          return parsed[0].id;
        }
      } catch (e) {
        console.error("Failed to load current project ID", e);
      }
    }
    return null;
  });
  
  const [isLoading, setIsLoading] = useState(false);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const currentProject = projects.find(p => p.id === currentProjectId);
  const lastScene = currentProject?.messages
    .filter(m => m.scene)
    .slice(-1)[0]?.scene;

  const handleNewProject = () => {
    const welcomeMsg: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: "Hello! I'm your INNO Studio assistant. Tell me what you'd like to build in 3D, and I'll generate it for you.",
      timestamp: Date.now()
    };

    const newProject: Project = {
      id: uuidv4(),
      name: 'New Creation',
      messages: [welcomeMsg],
      lastUpdated: Date.now()
    };
    setProjects([newProject, ...projects]);
    setCurrentProjectId(newProject.id);
  };

  const handleDeleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (currentProjectId === id) {
      setCurrentProjectId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleSendMessage = async (content: string, image?: string) => {
    if (!currentProjectId || isLoading) return;

    const userMsg: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      image,
      timestamp: Date.now()
    };

    // Update UI immediately
    setProjects(prev => prev.map(p => 
      p.id === currentProjectId 
        ? { ...p, messages: [...p.messages, userMsg], lastUpdated: Date.now() } 
        : p
    ));

    setIsLoading(true);
    try {
      const history = currentProject?.messages || [];
      console.log("Calling AI with history length:", history.length);
      const scene = await generateCADModel(content, history, image);
      console.log("Received scene from AI:", scene);
      
      if (!scene || !Array.isArray(scene.objects) || scene.objects.length === 0) {
        console.warn("AI returned a scene with no objects:", scene);
        // We still allow it but maybe warn the user if it's completely empty
        if (!scene.description || scene.description.includes("Error")) {
          throw new Error("AI failed to generate any 3D objects. Please try a different prompt.");
        }
      }

      const assistantMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: scene.description || "Here is the generated model.",
        scene,
        timestamp: Date.now()
      };

      setProjects(prev => prev.map(p => 
        p.id === currentProjectId 
          ? { 
              ...p, 
              name: p.messages.length === 1 ? (scene.name || content.slice(0, 30) + (content.length > 30 ? '...' : '')) : p.name,
              messages: [...p.messages, assistantMsg], 
              lastUpdated: Date.now() 
            } 
          : p
      ));
    } catch (error) {
      console.error("Generation failed:", error);
      const errorMsg: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API configuration.`,
        timestamp: Date.now()
      };
      setProjects(prev => prev.map(p => 
        p.id === currentProjectId 
          ? { ...p, messages: [...p.messages, errorMsg], lastUpdated: Date.now() } 
          : p
      ));
    } finally {
      setIsLoading(false);
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

    setProjects(prev => prev.map(p => {
      if (p.id !== currentProjectId) return p;
      const newMessages = [...p.messages];
      const lastMsgIndex = newMessages.map(m => !!m.scene).lastIndexOf(true);
      if (lastMsgIndex !== -1) {
        newMessages[lastMsgIndex] = { ...newMessages[lastMsgIndex], scene: updatedScene };
      }
      return { ...p, messages: newMessages };
    }));
  };

  const handleResetParams = () => {
    // Implementation for reset if needed
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
        {/* Left Sidebar */}
        <Sidebar 
          projects={projects}
          currentProjectId={currentProjectId}
          onSelectProject={setCurrentProjectId}
          onNewProject={handleNewProject}
          onDeleteProject={handleDeleteProject}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {currentProjectId ? (
            <>
              {/* Chat Panel */}
              <div className="w-[400px] flex-shrink-0">
                <ChatPanel 
                  messages={currentProject?.messages || []}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                />
              </div>

              {/* Viewport Area */}
              <div className="flex-1 flex flex-col p-6 gap-6 bg-slate-950">
                <div className="flex-1">
                  <Viewer 
                    objects={lastScene?.objects || []} 
                    projectName={currentProject?.name}
                  />
                </div>
              </div>

              {/* Right Param Panel */}
              <div className="w-80 flex-shrink-0 p-6 pl-0">
                <ParamPanel 
                  parameters={lastScene?.parameters || []}
                  onParamChange={handleParamChange}
                  onReset={handleResetParams}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <Box className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white">Welcome to INNO Studio</h2>
                <p className="text-slate-500 max-w-xs mx-auto">
                  Create a new project to start designing 3D models with natural language.
                </p>
              </div>
              <Button onClick={handleNewProject} className="bg-blue-600 hover:bg-blue-500 text-white px-8 h-11 rounded-xl shadow-lg shadow-blue-500/20">
                Start New Creation
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Helper icons for empty state
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
