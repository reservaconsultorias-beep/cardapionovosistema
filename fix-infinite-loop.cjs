const fs = require('fs');

const path = 'src/components/MenuItemCard.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/if \(photoSrc\.startsWith\('http'\)\) return photoSrc;/g, "if (photoSrc.startsWith('http')) return imgAttempt > 0 ? '' : photoSrc;");

fs.writeFileSync(path, code);
console.log("Fixed infinite loop in MenuItemCard.tsx");
