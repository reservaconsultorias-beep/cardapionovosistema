const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src/data/menu.ts');
let menuContent = fs.readFileSync(menuPath, 'utf8');

const imageMap = {
  // Esfihas
  '62 - Calabresa': '/62-calabresa.png',
  '65 - Carne': '/65-carne.png',
  '67 - Fiambre com Queijo': '/67-fiambre-com-queijo.png',
  '72 - Milho com Bacon': '/72-milho-com-bacon.png',
  '73 - Tradicional': '/73-tradicional.png',
  '74 - Margherita': '/26-margherita.png',
  '76 - Brócolis com Bacon': '/16-brocolis-com-bacon.png',
  '80 - Strogonoff de Carne': '/80-strogonoff-de-carne.png',
  '81 - Strogonoff de Frango': '/strogdefrangoinverso.png',
  '82 - Queijo': '/82-queijo.png',
  '85 - Banana com Canela': '/25-banana-com-canela.png',
  '87 - Chocolate Preto': '/27-chocolate-preto.png',
  '89 - MM\'s': '/89-mms.png',
  '93 - Prestígio': '/33-prestigio.png',

  // Pizzas
  '24 - Portuguesa': '/24-portuguesa.png',
  '26 - Margherita': '/26-margherita.png',
  '40 - Iscas de Carne': '/40-iscas-de-carne.png',
  '42 - Estrogonofe de Carne Inverso': '/42-estrogonofe-de-carne-inverso.png',
  
  // Beverages
  'Coca Cola (Lata)': '/coca-cola-lata.png',
  'Fanta Laranja (Lata)': '/fanta-laranja.png',
  '7up (Lata)': '/7up.png',
  'Coca Zero (Lata)': '/coca-zero-lata.png',
  'Guaraná Antártica (Lata)': '/guarana.png',
  'Sumol Laranja (Lata)': '/sumol-laranja.png',
  'Ice Tea Pêssego (Lata)': '/ice-pessego.png',
  'Água': '/agua.png',
  'Coca-Cola (Garrafa 1 litro) Normal e Zero': '/coca-zero-garrafa.png',
  'Cerveja Sagres': '/sagres-cerveja.png',
  'Cerveja Heineken': '/haineken.png'
};

let lines = menuContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let nameMatch = line.match(/name:\s*'([^']+)'/);
  if (nameMatch) {
    let name = nameMatch[1];
    if (imageMap[name]) {
      let correctUrl = imageMap[name];
      if (line.includes('imageUrl:')) {
        lines[i] = line.replace(/imageUrl:\s*'[^']+'/, `imageUrl: '${correctUrl}'`);
      } else {
        lines[i] = line.replace(/}(,)?$/, `, imageUrl: '${correctUrl}'}$1`);
      }
    }
  }
}

fs.writeFileSync(menuPath, lines.join('\n'), 'utf8');
console.log("menu.ts fixed explicitly!");
