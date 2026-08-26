const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `    {
      id: "menu-do-dia",
      label: "PROMOÇÃO DO DIA 📢",
      sub: "Prato promocional no almoço",
      group: ["menu-do-dia"],
    },`;

content = content.replace(target, '');
fs.writeFileSync(file, content, 'utf8');
console.log("App.tsx updated!");
