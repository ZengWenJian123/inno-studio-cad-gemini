import { SceneState } from '../types';

/**
 * A fast, client-side OpenSCAD parser that extracts basic geometric primitives 
 * to provide an immediate (though simplified) 3D preview without calling an LLM.
 */
export function fastParseScad(code: string): SceneState {
  const objects: any[] = [];
  
  // Basic Regex Patterns for common OpenSCAD primitives
  // 1. cube([x, y, z]) or cube(size)
  const cubeRegex = /cube\s*\(\s*(?:size\s*=\s*)?(\[[\d.,\s]+\]|\d+)/g;
  let match;
  let count = 0;
  
  while ((match = cubeRegex.exec(code)) !== null && count < 20) {
    const val = match[1].trim();
    let scale: [number, number, number] = [10, 10, 10];
    
    if (val.startsWith('[')) {
      const parts = val.replace(/[\[\]\s]/g, '').split(',').map(Number);
      if (parts.length === 3) scale = [parts[0], parts[1], parts[2]];
    } else {
      const s = Number(val) || 10;
      scale = [s, s, s];
    }
    
    objects.push({
      id: `fast_cube_${count}`,
      type: 'box',
      position: [count * 5, 0, 0], // Slight offset to distinguish multiple parts
      rotation: [0, 0, 0],
      scale,
      color: '#475569',
      name: `导入的立方体 ${count + 1}`
    });
    count++;
  }

  // 2. cylinder(h=20, r=10) or cylinder(20, 10)
  const cylRegex = /cylinder\s*\(\s*(?:h\s*=\s*)?(\d+)\s*,\s*(?:r\s*=\s*)?(\d+)/g;
  while ((match = cylRegex.exec(code)) !== null && count < 30) {
    const h = Number(match[1]) || 20;
    const r = Number(match[2]) || 10;
    objects.push({
      id: `fast_cyl_${count}`,
      type: 'cylinder',
      position: [count * 5, h / 2, 0],
      rotation: [Math.PI / 2, 0, 0],
      scale: [r, h, r],
      color: '#64748b',
      name: `导入的圆筒 ${count + 1}`
    });
    count++;
  }

  // Default placeholder if no primitives found
  if (objects.length === 0) {
    objects.push({
      id: 'import_placeholder',
      type: 'box',
      position: [0, 1, 0],
      scale: [50, 2, 50],
      color: '#334155',
      name: 'SCAD 工作区 (未检测到可视化部件)',
      opacity: 0.3
    });
  }

  return {
    name: "导入的模型",
    description: "模型已从 OpenSCAD 代码导入。为提高速度，已跳过 AI 分析。",
    objects,
    parameters: [],
    code: code
  };
}
