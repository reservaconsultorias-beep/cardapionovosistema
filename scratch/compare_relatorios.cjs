const fs = require('fs');
const orig = fs.readFileSync('scratch/original_admin.tsx', 'utf8');
const curr = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Extract relatorios from orig
const origRel = orig.slice(orig.indexOf('{activeTab === "relatorios"'), orig.indexOf('{activeTab === "cardapio-digital"'));
const currRel = curr.slice(curr.indexOf('{activeTab === "relatorios"'), curr.indexOf('{activeTab === "cardapio-digital"'));

console.log('Orig relatorios length:', origRel.length);
console.log('Curr relatorios length:', currRel.length);

fs.writeFileSync('scratch/orig_relatorios.tsx', origRel);
fs.writeFileSync('scratch/curr_relatorios.tsx', currRel);
