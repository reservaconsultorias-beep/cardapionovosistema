const fs = require('fs');

const menuPath = 'src/data/menu.ts';
let code = fs.readFileSync(menuPath, 'utf8');

const imageMap = {
  '62 - Calabresa': '/2 - Calabresa.png',
  '65 - Carne': '/5 - Carne.png',
  '67 - Fiambre com Queijo': '/7 - Fiambre com Queijo.png',
  '72 - Milho com Bacon': '/12 - Milho com Bacon.png',
  '73 - Tradicional': '/13 - Tradicional.png',
  '74 - Margherita': '/26 - Margherita.png',
  '76 - Brócolis com Bacon': '/16-brocolis-com-bacon.png',
  '80 - Strogonoff de Carne': '/20 - Strogonoff de Carne.png',
  '81 - Strogonoff de Frango': '/strogdefrangoinverso.png',
  '82 - Queijo': '/22-queijo.png',
  '85 - Banana com Canela': '/25 - Banana com Canela.png',
  '87 - Chocolate Preto': '/27 - Chocolate Preto.png',
  '93 - Prestígio': '/33 - Prestígio.png',
  '89 - MM\'s': '/43 - 2970.png' // using 43-2970 as a fallback since MMs is missing but 43 is colorful maybe? Actually I will just leave MM's out, the user will upload it if needed.
};
delete imageMap['89 - MM\'s']; 

const lines = code.split('\n');
const newLines = lines.map(line => {
    if (line.includes('{id:')) {
        const nameMatch = line.match(/name:\s*'([^']+)'/);
        if (nameMatch) {
            const name = nameMatch[1];
            
            if (imageMap[name]) {
               let newLine = line.replace(/,\s*imageUrl:\s*['"][^'"]*['"]/g, '');
               newLine = newLine.replace(/,\s*imageUrl:\s*''/g, '');
               newLine = newLine.replace(/imageUrl:\s*['"][^'"]*['"],\s*/g, '');
               
               newLine = newLine.replace(/}(?!.*})/, `, imageUrl: '${imageMap[name]}'}`);
               return newLine;
            }
        }
    }
    return line;
});

fs.writeFileSync(menuPath, newLines.join('\n'));
console.log("Added new esfiha images to menu.ts.");
