const fs = require('fs');

const menuPath = 'src/data/menu.ts';
let code = fs.readFileSync(menuPath, 'utf8');

const map = {
  '1 - Alho e Óleo': '1-alhoeoleo.png',
  '16 - Da Casa': '16-dacasa.png',
  '19 - Frango com Catupiry': '19-frangocomcatupiry.png',
  '2 - Atum': '2-atum.png',
  '24 - Portuguesa': '24-portuguesa.png',
  '25 - Tradicional': '25-tradicional.png',
  '26 - Margherita': '26-margherita.png',
  '3 - Bacon': '3-bacon.png',
  '39 - 41 Menu\'s': '39-41menus.png',
  '4 - Baiana': '4-baiana.png',
  '40 - Iscas de Carne': '40-iscasdecarne.png',
  '42 - Estrogonofe de Carne Inverso': '42-estrogonofe decarneinverso.png',
  '43 - 2970': '43-2970.png',
  '5 - Brasileira': '5-brasileira.png',
  '51 - Leite Ninho - Nido': '51-Leiteninhonido.png',
  '6 - Calabresa': '6-calabresa.png'
};

const baseUrl = 'https://tipnhvpivhaerumetona.supabase.co/storage/v1/object/public/Cardapio/';

const lines = code.split('\n');
const newLines = lines.map(line => {
    if (line.includes('{id:')) {
        const nameMatch = line.match(/name:\s*'([^']+)'/);
        if (nameMatch) {
            const name = nameMatch[1];
            
            // Remove any existing imageUrl
            let newLine = line.replace(/,\s*imageUrl:\s*['"][^'"]*['"]/g, '');
            newLine = newLine.replace(/,\s*imageUrl:\s*''/g, '');
            newLine = newLine.replace(/imageUrl:\s*['"][^'"]*['"],\s*/g, '');
            
            if (map[name]) {
               // Append the exact supabase url
               const fullUrl = baseUrl + encodeURI(map[name]);
               newLine = newLine.replace(/}(?!.*})/, `, imageUrl: '${fullUrl}'}`);
            }
            return newLine;
        }
    }
    return line;
});

fs.writeFileSync(menuPath, newLines.join('\n'));
console.log("Updated menu.ts with Supabase URLs.");
