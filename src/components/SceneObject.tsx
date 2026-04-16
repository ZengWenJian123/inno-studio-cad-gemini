import React from 'react';
import { CADObject } from '../types';

interface SceneObjectProps {
  object: CADObject;
}

export const SceneObject: React.FC<SceneObjectProps> = ({ object }) => {
  const { 
    type, 
    position = [0, 0, 0], 
    rotation = [0, 0, 0], 
    scale = [1, 1, 1], 
    color = '#ffffff', 
    opacity = 1 
  } = object;

  const getGeometry = () => {
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

  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      {getGeometry()}
      <meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
};
