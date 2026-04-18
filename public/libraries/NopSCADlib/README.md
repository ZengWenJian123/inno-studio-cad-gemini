# NopSCADlib Integration

This directory is the mounting point for NopSCADlib. 

## Integration Status
- AI Prompt updated: The AI "Inno Studio" is now aware of NopSCADlib and its vitamin syntax.
- Project Reference: `include <NopSCADlib/core.scad>`

## How to use
When the AI generates a model using NopSCADlib components (e.g., fans, resistors, screws), it will:
1. Include the core library in the OpenSCAD code.
2. Provide a simplified 3D preview using basic WebGL shapes.

## Manual Installation
To use the full library features in your local OpenSCAD:
1. Download NopSCADlib from https://github.com/nophead/NopSCADlib
2. Place it in this directory (`public/libraries/NopSCADlib/`) or add it to your OpenSCAD library path.
