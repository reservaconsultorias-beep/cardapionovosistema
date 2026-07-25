const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src/data/menu.ts');
let menuContent = fs.readFileSync(menuPath, 'utf8');

const diaMap = {
  'md-1': '/segunda.png',
  'md-2': '/terca.png',
  'md-3': '/quarta.png',
  'md-4': '/quinta.png',
  'md-5': '/sexta.png',
  'md-6': '/sabado.png'
};

let lines = menuContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (const [id, url] of Object.entries(diaMap)) {
    if (line.includes(`id: '${id}'`)) {
      if (line.includes('imageUrl:')) {
        lines[i] = line.replace(/imageUrl:\s*'[^']+'/, `imageUrl: '${url}'`);
      } else {
        lines[i] = line.replace(/}(,)?$/, `, imageUrl: '${url}'}$1`);
      }
    }
  }
}

fs.writeFileSync(menuPath, lines.join('\n'), 'utf8');
console.log("menu.ts updated for menu do dia images!");
