const fs = require('fs');
const path = require('path');

const menuPath = path.join(__dirname, 'src', 'data', 'menu.ts');
let content = fs.readFileSync(menuPath, 'utf8');

// Replace imageUrl: '...' with imageUrl: '/${item.name}.png' or similar.
// Wait, we can just replace the whole array by parsing it.
// Actually, it's easier to just use regex to replace imageUrl, but some don't have imageUrl.
