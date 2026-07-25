const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src/data/menu.ts');
let menuContent = fs.readFileSync(menuPath, 'utf8');

let lines = menuContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  if (line.includes('86-chocolatebranco.png')) {
    if (!line.includes('86 - Chocolate Branco')) {
      lines[i] = line.replace(/,\s*imageUrl:\s*'\/86-chocolatebranco\.png'/g, '');
    }
  }
}

fs.writeFileSync(menuPath, lines.join('\n'), 'utf8');
console.log("menu.ts fixed for 86!");
