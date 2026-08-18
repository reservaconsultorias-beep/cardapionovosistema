const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/data/menu.ts');
let content = fs.readFileSync(file, 'utf8');

const days = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

days.forEach(day => {
  const re = new RegExp(`imageUrl:\\s*'\\/(${day})\\.png'`, 'g');
  content = content.replace(re, `imageUrl: '/$1.png', imageUrl2: '/$1-esfirra.png'`);
});

fs.writeFileSync(file, content, 'utf8');
console.log("Data updated!");
