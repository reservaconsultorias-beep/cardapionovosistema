const fs = require('fs');
const orig = fs.readFileSync('scratch/original_admin.tsx', 'utf8').split('\n');
const curr = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8').split('\n');

console.log('Orig lines:', orig.length, 'Curr lines:', curr.length);

// Let's inspect where the big additions are in curr
// Let's check sections in curr
const sections = [
  'activeTab === "visao-geral"',
  'activeTab === "pedidos"',
  'activeTab === "relatorios"',
  'activeTab === "cardapio-digital"',
  'activeTab === "despesas"',
  'activeTab === "funil"'
];

for (const sec of sections) {
  const origIndex = orig.findIndex(l => l.includes(sec));
  const currIndex = curr.findIndex(l => l.includes(sec));
  console.log(`Section: ${sec} -> Orig: line ${origIndex + 1}, Curr: line ${currIndex + 1}`);
}
