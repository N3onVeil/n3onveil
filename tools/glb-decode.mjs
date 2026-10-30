import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync('assets/deer.json', 'utf8'));
const buf = Buffer.from(j.content, 'base64');
fs.writeFileSync('assets/Deer.glb', buf);
console.log('Deer.glb', buf.length);
