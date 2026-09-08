const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

const tabStarts = [
  { tab: 'usuarios', line: 1817 },
  { tab: 'categorias', line: 1823 },
  { tab: 'clientes', line: 1829 },
  { tab: 'funil', line: 1836 },
  { tab: 'despesas', line: 1844 },
  { tab: 'caixa', line: 1853 },
  { tab: 'configuracoes', line: 1860 },
  { tab: 'gestao-cardapio', line: 1875 },
  { tab: 'banner-promocional', line: 1881 },
  { tab: 'agente-ia', line: 1888 },
  { tab: 'visao-geral', line: 1895 },
  { tab: 'pedidos', line: 2181 },
  { tab: 'relatorios', line: 2341 },
  { tab: 'cardapio-digital', line: 2859 },
];

for (let i = 0; i < tabStarts.length; i++) {
  const current = tabStarts[i];
  const next = tabStarts[i+1];
  console.log(`Tab: ${current.tab} (starts line ${current.line})`);
  const endLine = next ? next.line - 1 : lines.length;
  // Print the last 5 lines before next tab
  for (let l = Math.max(current.line, endLine - 4); l <= endLine; l++) {
    console.log(`  ${l}: ${lines[l-1]}`);
  }
}
