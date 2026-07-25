const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const menuPath = path.join(__dirname, 'src/data/menu.ts');

let menuContent = fs.readFileSync(menuPath, 'utf8');

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

const files = fs.readdirSync(publicDir);
let changedCount = 0;

for (const file of files) {
  if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp')) {
    const ext = path.extname(file);
    const basename = path.basename(file, ext);
    
    // We want to remove accents before slugifying
    const normalized = basename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let newName = slugify(normalized) + ext;
    
    if (newName !== file) {
      // rename the file
      fs.renameSync(path.join(publicDir, file), path.join(publicDir, newName));
      
      // Update menu.ts
      // The menu.ts might have imageUrl: '/Old Name.png' or imageUrl: '/Old%20Name.png'
      const oldPathEscaped = '/' + file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`['"]${oldPathEscaped}['"]`, 'g');
      menuContent = menuContent.replace(regex, `'/${newName}'`);
      
      // Also check if there's any encoded version in menu.ts
      const oldPathEncoded = '/' + encodeURI(file).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexEncoded = new RegExp(`['"]${oldPathEncoded}['"]`, 'g');
      menuContent = menuContent.replace(regexEncoded, `'/${newName}'`);
      
      changedCount++;
      console.log(`Renamed: "${file}" -> "${newName}"`);
    }
  }
}

fs.writeFileSync(menuPath, menuContent, 'utf8');
console.log(`Done. Renamed ${changedCount} images and updated menu.ts`);
