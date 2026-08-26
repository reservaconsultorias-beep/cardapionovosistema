const fs = require('fs');
const file = '/app/applet/src/components/MenuItemCard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "return `/${base}`;",
  "return `/${base}?v=2`;"
);

content = content.replace(
  "return `/${base}${exts[imgAttempt - 1]}`;",
  "return `/${base}${exts[imgAttempt - 1]}?v=2`;"
);

content = content.replace(
  "if (photoSrc.startsWith('http')) return imgAttempt > 0 ? '' : photoSrc;",
  "if (photoSrc.startsWith('http')) return imgAttempt > 0 ? '' : (photoSrc + '?v=2');"
);

fs.writeFileSync(file, content, 'utf8');
console.log("Image cache buster added.");
