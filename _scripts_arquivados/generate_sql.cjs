const fs = require('fs');
const content = fs.readFileSync('src/data/menu.ts', 'utf8');
const match = content.match(/\{id:\s*'e-\d+'.*?\}/g);
let sql = '';
if (match) {
  match.forEach(m => {
    const id = m.match(/id:\s*'([^']+)'/)[1];
    const name = m.match(/name:\s*'([^']+)'/)[1];
    const safeName = name.replace(/'/g, "''");
    sql += `UPDATE menu_items SET name = '${safeName}' WHERE id = '${id}';\n`;
  });
  fs.writeFileSync('update_names.sql', sql);
}
