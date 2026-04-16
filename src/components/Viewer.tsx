import React, { Suspense, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, ContactShadows, PerspectiveCamera, GizmoHelper, GizmoViewport, Html } from '@react-three/drei';
import { CADObject } from '../types';
import { SceneObject } from './SceneObject';
import { Button } from './ui/button';
import { Download, Maximize2, Box, Share2 } from 'lucide-react';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';

interface ViewerProps {
  objects: CADObject[];
  projectName?: string;
}

const ExportHandler = ({ objects, projectName }: ViewerProps) => {
  const { scene } = useThree();

  const handleExportSTL = () => {
    const exportGroup = scene.getObjectByName('export-group');
    if (!exportGroup) return;

    const exporter = new STLExporter();
    const result = exporter.parse(exportGroup);
    const blob = new Blob([result], { type: 'text/plain' });
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName || 'model'}.stl`;
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div className="absolute bottom-6 right-6 flex flex-col gap-3 items-end pointer-events-auto">
        <div className="flex gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800"
            title="Wireframe Mode"
          >
            <Box className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleExportSTL}
            className="bg-white hover:bg-slate-100 text-slate-950 font-bold px-6 h-12 rounded-xl shadow-xl flex items-center gap-2 group transition-all"
          >
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            STL
          </Button>
        </div>
      </div>
    </Html>
  );
};

import { Geometry, Base, Subtraction, Addition, Intersection } from '@react-three/csg';

const getGeometry = (type: string) => {
  switch (type) {
    case 'box': return <boxGeometry />;
    case 'sphere': return <sphereGeometry args={[1, 32, 32]} />;
    case 'cylinder': return <cylinderGeometry args={[1, 1, 1, 32]} />;
    case 'cone': return <coneGeometry args={[1, 1, 32]} />;
    case 'torus': return <torusGeometry args={[1, 0.25, 16, 100]} />;
    case 'plane': return <planeGeometry args={[1, 1]} />;
    default: return <boxGeometry />;
  }
};

export const Viewer: React.FC<ViewerProps> = ({ objects, projectName }) => {
  // Check if any object uses CSG operations
  const useCSG = objects.some(obj => obj.operation);

  return (
    <div className="w-full h-full bg-[#1a1a1a] rounded-2xl overflow-hidden shadow-inner relative group/viewer">
      <Canvas shadows gl={{ antialias: true, preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[150, 150, 150]} fov={45} near={0.1} far={10000} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[200, 200, 200]} intensity={1.5} castShadow />
          <spotLight position={[-200, 200, 200]} angle={0.15} penumbra={1} intensity={2} castShadow />
          
          <group name="export-group">
            {useCSG ? (
              <mesh castShadow receiveShadow>
                <Geometry useGroups>
                  {objects.map((obj, index) => {
                    const { type, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1], color = '#ffffff', opacity = 1, operation } = obj;
                    
                    // Default to Base for the first object if not specified
                    let Op = Addition;
                    if (index === 0 || operation === 'base') Op = Base;
                    else if (operation === 'subtract') Op = Subtraction;
                    else if (operation === 'intersect') Op = Intersection;

                    return (
                      <Op key={obj.id} position={position} rotation={rotation} scale={scale}>
                        {getGeometry(type)}
                        <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
                      </Op>
                    );
                  })}
                </Geometry>
              </mesh>
            ) : (
              objects.map((obj) => (
                <SceneObject key={obj.id} object={obj} />
              ))
            )}
          </group>

          <Grid
            infiniteGrid
            fadeDistance={2000}
            fadeStrength={5}
            cellSize={10}
            sectionSize={50}
            sectionColor="#334155"
            cellColor="#1e293b"
            position={[0, -0.01, 0]}
          />
          
          <ContactShadows position={[0, -0.01, 0]} opacity={0.6} scale={1000} blur={2} far={200} />
          <Environment preset="city" />
          
          <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
            <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
          </GizmoHelper>

          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} maxDistance={5000} />
        </Suspense>
        <ExportHandler objects={objects} projectName={projectName} />
      </Canvas>

      {/* Top Controls */}
      <div className="absolute top-6 left-6 flex items-center gap-4 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-xl shadow-xl pointer-events-auto flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-200 tracking-tight uppercase">{projectName || 'Untitled Creation'}</span>
        </div>
        <Button variant="ghost" size="sm" className="bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-200 rounded-xl h-9 px-4 pointer-events-auto flex items-center gap-2 hover:bg-slate-800">
          <Share2 className="w-3.5 h-3.5" />
          Share
        </Button>
      </div>
    </div>
  );
};
