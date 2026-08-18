const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(file, 'utf8');

const target = `    {
      id: "esfihas",
      label: "ESFIHAS 🧆",
      sub: "As melhores esfihas da cidade",
      group: [
        "esfihas-salgadas-tradicionais",
        "esfihas-salgadas-especiais",
        "esfihas-doces",
      ],
    },`;

content = content.replace(target, '');
fs.writeFileSync(file, content, 'utf8');
console.log("App.tsx updated!");
