const fs = require('fs');

const menuPath = 'src/data/menu.ts';
let code = fs.readFileSync(menuPath, 'utf8');

const drinkUrls = {
  'Coca Cola (Lata)': '/Coca Cola Lata.png',
  'Fanta Laranja (Lata)': '/Fanta Laranja.png',
  '7up (Lata)': '/7up.png',
  'Coca Zero (Lata)': '/Coca Zero lata.png',
  'Guaraná Antártica (Lata)': '/guaraná.png',
  'Sumol Laranja (Lata)': '/Sumol Laranja.png',
  'Ice Tea Pêssego (Lata)': '/Ice Pêssego.png',
  'Água': '/Água.png',
  'Coca-Cola (Garrafa 1 litro) Normal e Zero': '/Coca Zero Garrafa.png',
  'Cerveja Sagres': '/Sagres Cerveja.png',
  'Cerveja Heineken': '/haineken.png'
};

const lines = code.split('\n');
const newLines = lines.map(line => {
    if (line.includes('{id:')) {
        const nameMatch = line.match(/name:\s*'([^']+)'/);
        if (nameMatch) {
            const name = nameMatch[1];
            
            if (drinkUrls[name]) {
               // Remove any existing imageUrl
               let newLine = line.replace(/,\s*imageUrl:\s*['"][^'"]*['"]/g, '');
               newLine = newLine.replace(/,\s*imageUrl:\s*''/g, '');
               newLine = newLine.replace(/imageUrl:\s*['"][^'"]*['"],\s*/g, '');
               
               newLine = newLine.replace(/}(?!.*})/, `, imageUrl: '${drinkUrls[name]}'}`);
               return newLine;
            }
        }
    }
    return line;
});

fs.writeFileSync(menuPath, newLines.join('\n'));
console.log("Restored drink URLs in menu.ts to local public files.");
