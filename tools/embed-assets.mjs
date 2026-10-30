import fs from 'node:fs';

const read = (p) => 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64');
const png = (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
const glb = 'data:model/gltf-binary;base64,' + fs.readFileSync('assets/Deer.glb').toString('base64');

const wood = {
  diff: read('assets/textures/wood_planks_diff_1k.jpg'),
  nor: read('assets/textures/wood_planks_nor_1k.jpg'),
  rough: read('assets/textures/wood_planks_rough_1k.jpg')
};
const snow = {
  diff: read('assets/textures/snow_diff_1k.jpg'),
  nor: read('assets/textures/snow_nor_1k.jpg'),
  rough: read('assets/textures/snow_rough_1k.jpg')
};
const foot = png('assets/textures/footprint.png');

let out = 'window.AH_ASSETS = {\n';
for (const [k, v] of Object.entries(wood)) out += `  wood: { ${Object.keys(wood).map((x) => `${x}: ${JSON.stringify(wood[x])}`).join(', ')} },\n` .slice(0, 0);
out += `  wood: {\n${Object.entries(wood).map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`).join('\n')}\n  },\n`;
out += `  snow: {\n${Object.entries(snow).map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`).join('\n')}\n  },\n`;
out += `  foot: ${JSON.stringify(foot)},\n`;
out += `  deer: ${JSON.stringify(glb)}\n};\n`;
fs.writeFileSync('src/06-assets.js', out);
console.log('assets', out.length);
