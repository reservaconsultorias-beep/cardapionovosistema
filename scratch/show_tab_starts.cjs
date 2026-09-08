const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

const tabNames = [
  'usuarios',
  'categorias',
  'clientes',
  'funil',
  'despesas',
  'caixa',
  'configuracoes',
  'gestao-cardapio',
  'banner-promocional',
  'agente-ia',
  'visao-geral',
  'pedidos',
  'relatorios',
  'cardapio-digital'
];

tabNames.forEach(t => {
  const lineIdx = lines.findIndex(l => l.includes(`activeTab === "${t}"`) || l.includes(`activeTab === '${t}'`));
  if (lineIdx !== -1) {
    console.log(`\n=================== TAB: ${t} (Line ${lineIdx + 1}) ===================`);
    for (let j = lineIdx; j < Math.min(lines.length, lineIdx + 20); j++) {
      console.log(`  ${j+1}: ${lines[j]}`);
    }
  }
});
