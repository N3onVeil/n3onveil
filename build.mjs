// 把 three.module.js 转成全局 THREE，再把 src/*.js 内联进单文件 HTML。
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');

const three = read('vendor/three.module.js');
const exportAt = three.lastIndexOf('export {');
if (exportAt < 0) throw new Error('three.module.js: export block not found');

const body = three.slice(0, exportAt);
const exportBlock = three.slice(exportAt);
const inner = exportBlock.replace(/^export\s*\{/, '').replace(/\}\s*;?\s*$/, '');
const props = inner
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => {
    const m = s.split(/\s+as\s+/);
    return m.length === 2 ? `${m[1]}: ${m[0]}` : `${m[0]}: ${m[0]}`;
  });
const threeGlobal = `\nwindow.THREE = { ${props.join(', ')} };\n`;

const order = ['00-util', '06-assets', '07-gltf', '05-pbr', '10-render', '15-post', '20-world', '22-cabin', '24-trees', '26-life', '30-player', '40-main'];
const app = order.map((n) => `\n/* ===================== ${n} ===================== */\n` + read(`src/${n}.js`)).join('\n');

const shell = read('src/shell.html');
const out = shell
  .replace('/*__THREE__*/', () => `(function(){\n${body}\n${threeGlobal}})();`)
  .replace('/*__APP__*/', () => `(function(){\n'use strict';\n${app}\n})();`);

writeFileSync(join(root, 'aurora-hollow.html'), out);
const kb = (statSync(join(root, 'aurora-hollow.html')).size / 1024).toFixed(0);
console.log(`built aurora-hollow.html  ${kb} KB  (app ${(app.length / 1024).toFixed(0)} KB)`);
