const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src/data/menu.ts');
let menuContent = fs.readFileSync(menuPath, 'utf8');

function getFilename(nameStr) {
  let match = nameStr.match(/^(\d+)\s*-\s*(.+)$/);
  if (match) {
    let num = match[1];
    let name = match[2];
    name = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
    name = name.replace(/[^a-z0-9]/g, "");
    return `${num}-${name}.png`;
  } else {
    let name = nameStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toLowerCase();
    name = name.replace(/[^a-z0-9]/g, "");
    return `${name}.png`;
  }
}

// We will use a regex to replace imageUrls, or just parse the JS object.
// Parsing the JS file safely:
// Let's replace line by line
let lines = menuContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let nameMatch = line.match(/name:\s*'([^']+)'/);
  if (nameMatch) {
    let name = nameMatch[1];
    let filename = getFilename(name);
    
    let hasImageUrl = line.match(/imageUrl:\s*'([^']+)'/);
    if (hasImageUrl) {
      let currentUrl = hasImageUrl[1];
      if (currentUrl.startsWith('http')) {
        // Replace just the end of the Supabase URL
        let newUrl = currentUrl.replace(/\/[^\/]+$/, '/' + filename);
        lines[i] = line.replace(currentUrl, newUrl);
      } else {
        // Replace with new local url
        lines[i] = line.replace(currentUrl, '/' + filename);
      }
    } else {
      // We don't necessarily add imageUrl to all items unless it's easy.
      // The user wants beverages and esfihas fixed. Let's add local imageUrl if missing.
      // We'll append it before the closing '}'
      let newUrl = '/' + filename;
      lines[i] = line.replace(/}(,)?$/, `, imageUrl: '${newUrl}'}$1`);
    }
  }
}

fs.writeFileSync(menuPath, lines.join('\n'), 'utf8');
console.log("menu.ts fixed!");
