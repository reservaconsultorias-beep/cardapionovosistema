const fs = require('fs');

const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (
    l.includes('Faturamento Geral') ||
    l.includes('faturamentoGeral') ||
    l.includes('Vendas de produtos') ||
    l.includes('Vendas de complementos') ||
    l.includes('Formas de Pagamento') ||
    l.includes('431.10') ||
    l.includes('66.21')
  ) {
    console.log(`L${idx + 1}: ${l.trim()}`);
  }
});
