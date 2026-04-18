import { SceneState, Template } from '../types';

export const TEMPLATES: Template[] = [
  {
    id: 'basic-box',
    name: '模块化壳体',
    description: '一个中间带孔的简单盒子，非常适合作为外壳。',
    thumbnail: '📦',
    scene: {
      name: '模块化壳体',
      description: '一个带有中央安装孔的基础外壳。',
      objects: [
        {
          id: 'base-box',
          type: 'box',
          operation: 'base',
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [50, 20, 50],
          color: '#3b82f6',
          name: '主外壳'
        },
        {
          id: 'hole',
          type: 'cylinder',
          operation: 'subtract',
          position: [0, 0, 0],
          rotation: [Math.PI / 2, 0, 0],
          scale: [10, 25, 10],
          color: '#ef4444',
          name: '安装孔'
        }
      ],
      parameters: [
        {
          id: 'width',
          name: '宽度',
          value: 50,
          min: 10,
          max: 100,
          unit: 'mm',
          targetObjectId: 'base-box',
          targetProperty: 'scale.x'
        },
        {
          id: 'hole-size',
          name: '孔径',
          value: 10,
          min: 1,
          max: 20,
          unit: 'mm',
          targetObjectId: 'hole',
          targetProperty: 'scale.x'
        }
      ],
      code: `include <BOSL2/std.scad>\ndifference() {\n  cuboid([50, 20, 50]);\n  cyl(h=25, r=10, orientation=Y);\n}`
    }
  },
  {
    id: 'simple-cup',
    name: '经典马克杯',
    description: '带手柄的参数化马克杯。',
    thumbnail: '☕',
    scene: {
      name: '经典马克杯',
      description: '带有符合人体工程学手柄的标准马克杯设计。',
      objects: [
        {
          id: 'mug-body',
          type: 'cylinder',
          operation: 'base',
          position: [0, 0, 0],
          rotation: [Math.PI / 2, 0, 0],
          scale: [30, 80, 30],
          color: '#ffffff',
          name: '杯身'
        },
        {
          id: 'mug-hollow',
          type: 'cylinder',
          operation: 'subtract',
          position: [0, 5, 0],
          rotation: [Math.PI / 2, 0, 0],
          scale: [26, 80, 26],
          color: '#f1f5f9',
          name: '杯内空间'
        },
        {
          id: 'handle',
          type: 'torus',
          operation: 'add',
          position: [30, 0, 0],
          rotation: [0, 0, 0],
          scale: [15, 15, 15],
          color: '#ffffff',
          name: '手柄'
        }
      ],
      parameters: [
        {
          id: 'mug-height',
          name: '高度',
          value: 80,
          min: 40,
          max: 120,
          unit: 'mm',
          targetObjectId: 'mug-body',
          targetProperty: 'scale.y'
        }
      ],
      code: `include <BOSL2/std.scad>\ndifference() {\n  cyl(h=80, r=30, rounding=2);\n  up(5) cyl(h=80, r=26);\n}\ntranslate([30, 0, 0]) rotate_extrude() translate([15, 0]) circle(r=4);`
    }
  },
  {
    id: 'gear-template',
    name: '精密齿轮',
    description: '一个 24 齿正齿轮组件。',
    thumbnail: '⚙️',
    scene: {
      name: '精密齿轮',
      description: '针对机械装配优化的 24 齿正齿轮。',
      objects: [
        {
          id: 'gear-disc',
          type: 'cylinder',
          operation: 'base',
          position: [0, 0, 0],
          rotation: [Math.PI / 2, 0, 0],
          scale: [40, 10, 40],
          color: '#94a3b8',
          name: '齿轮主体'
        },
        {
          id: 'center-hole',
          type: 'cylinder',
          operation: 'subtract',
          position: [0, 0, 0],
          rotation: [Math.PI / 2, 0, 0],
          scale: [5, 15, 5],
          color: '#ef4444',
          name: '轴孔'
        }
      ],
      parameters: [
        {
          id: 'gear-radius',
          name: '外半径',
          value: 40,
          min: 10,
          max: 100,
          unit: 'mm',
          targetObjectId: 'gear-disc',
          targetProperty: 'scale.x'
        }
      ],
      code: `include <BOSL2/std.scad>\ninclude <BOSL2/gears.scad>\nspur_gear(circ_pitch=5, teeth=24, thickness=10, shaft_diam=10);`
    }
  },
  {
    id: 'heat-sink',
    name: '工业散热片',
    description: '用于热管理的参数化鳍片散热片。',
    thumbnail: '🔥',
    scene: {
      name: '工业散热片',
      description: '具有可调鳍片数量和厚度的高表面积散热片。',
      objects: [
        {
          id: 'base-plate',
          type: 'box',
          operation: 'base',
          position: [0, -5, 0],
          rotation: [0, 0, 0],
          scale: [60, 10, 60],
          color: '#334155',
          name: '基板'
        },
        {
          id: 'fin-1',
          type: 'box',
          operation: 'add',
          position: [-22.5, 10, 0],
          rotation: [0, 0, 0],
          scale: [5, 20, 60],
          color: '#475569',
          name: '鳍片 1'
        },
        {
          id: 'fin-2',
          type: 'box',
          operation: 'add',
          position: [-7.5, 10, 0],
          rotation: [0, 0, 0],
          scale: [5, 20, 60],
          color: '#475569',
          name: '鳍片 2'
        },
        {
          id: 'fin-3',
          type: 'box',
          operation: 'add',
          position: [7.5, 10, 0],
          rotation: [0, 0, 0],
          scale: [5, 20, 60],
          color: '#475569',
          name: '鳍片 3'
        },
        {
          id: 'fin-4',
          type: 'box',
          operation: 'add',
          position: [22.5, 10, 0],
          rotation: [0, 0, 0],
          scale: [5, 20, 60],
          color: '#475569',
          name: '鳍片 4'
        }
      ],
      parameters: [
        {
          id: 'base-width',
          name: '基板宽度',
          value: 60,
          min: 40,
          max: 120,
          unit: 'mm',
          targetObjectId: 'base-plate',
          targetProperty: 'scale.x'
        },
        {
          id: 'fin-height',
          name: '鳍片高度',
          value: 20,
          min: 5,
          max: 50,
          unit: 'mm',
          targetObjectId: 'fin-1',
          targetProperty: 'scale.y'
        }
      ],
      code: `include <BOSL2/std.scad>\n\nmodule heat_sink(w=60, h=10, fin_h=20, fins=4) {\n  cuboid([w, h, w], anchor=BOTTOM);\n  xcopies(spacing=w/(fins+1), n=fins)\n    cuboid([5, fin_h, w], anchor=BOTTOM);\n}\n\nheat_sink();`
    }
  },
  {
    id: 'bracket-l',
    name: '安装支架',
    description: '用于结构支撑的加固 L 型支架。',
    thumbnail: '📐',
    scene: {
      name: 'L-支架',
      description: '带有安装孔和加强筋的参数化 L 型支架。',
      objects: [
        {
          id: 'base-leg',
          type: 'box',
          operation: 'base',
          position: [0, -2, 20],
          rotation: [0, 0, 0],
          scale: [40, 4, 40],
          color: '#64748b',
          name: '底座支脚'
        },
        {
          id: 'up-leg',
          type: 'box',
          operation: 'add',
          position: [0, 20, 0],
          rotation: [0, 0, 0],
          scale: [40, 40, 4],
          color: '#64748b',
          name: '垂直支脚'
        },
        {
          id: 'hole-1',
          type: 'cylinder',
          operation: 'subtract',
          position: [12, -2, 30],
          rotation: [Math.PI / 2, 0, 0],
          scale: [4, 10, 4],
          color: '#ef4444',
          name: '孔 1'
        },
        {
          id: 'hole-2',
          type: 'cylinder',
          operation: 'subtract',
          position: [-12, -2, 30],
          rotation: [Math.PI / 2, 0, 0],
          scale: [4, 10, 4],
          color: '#ef4444',
          name: '孔 2'
        }
      ],
      parameters: [
        {
          id: 'thickness',
          name: '厚度',
          value: 4,
          min: 2,
          max: 10,
          unit: 'mm',
          targetObjectId: 'base-leg',
          targetProperty: 'scale.y'
        }
      ],
      code: `include <BOSL2/std.scad>\n\ndifference() {\n  union() {\n    cuboid([40, 4, 40], anchor=BOTTOM+FRONT);\n    cuboid([40, 40, 4], anchor=BOTTOM+BACK);\n  }\n  xcopies(24) back(30) cyl(h=10, d=4, orientation=Y);\n}`
    }
  }
];
