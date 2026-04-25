const fs = require('fs');
const JSZip = require('jszip');

async function checkNop() {
  const data = fs.readFileSync('public/libraries/NopSCADlib.zip');
  const zip = await JSZip.loadAsync(data);
  const coreFile = zip.file('examples/MainsBreakOutBox/scad/bob_main.scad');
  if (coreFile) {
    const text = await coreFile.async('text');
    console.log(text.split('\\n').filter(line => line.includes('include')).join('\\n'));
  }
}
checkNop().catch(console.error);
