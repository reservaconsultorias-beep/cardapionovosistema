const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src/data/menu.ts');
const publicDir = path.join(__dirname, 'public');
let menuContent = fs.readFileSync(menuPath, 'utf8');

// Get all files in public
const publicFiles = fs.readdirSync(publicDir);

let lines = menuContent.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  let imageUrlMatch = line.match(/imageUrl:\s*'([^']+)'/);
  if (imageUrlMatch) {
    let url = imageUrlMatch[1];
    
    // Ignore external URLs
    if (url.startsWith('http')) {
      continue;
    }
    
    // Extract filename
    let filename = url.replace(/^\//, '');
    
    // Check if filename exists in public
    if (!publicFiles.includes(filename)) {
      // Image does not exist, remove imageUrl property
      // E.g. , imageUrl: '/71-milho.png'} -> }
      lines[i] = line.replace(/,\s*imageUrl:\s*'[^']+'/g, '');
    }
  }
}

fs.writeFileSync(menuPath, lines.join('\n'), 'utf8');
console.log("menu.ts updated to remove missing images!");
