const fs = require('fs');

const adminCode = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const mainCode = fs.readFileSync('src/main.tsx', 'utf8');
const funnelCode = fs.readFileSync('src/components/SalesFunnelManager.tsx', 'utf8');

console.log('=== ROUTING & ISOLATION VERIFICATION ===');
console.log('1. main.tsx has /admin/:tab route:', mainCode.includes('/admin/:tab'));
console.log('2. AdminDashboard imports useParams:', adminCode.includes('useParams'));
console.log('3. AdminDashboard imports useNavigate:', adminCode.includes('useNavigate'));
console.log('4. AdminDashboard imports useSearchParams:', adminCode.includes('useSearchParams'));

const lines = adminCode.split('\n');
const funnelOccurrences = [];
lines.forEach((l, i) => {
  if (l.includes('<SalesFunnelManager')) {
    funnelOccurrences.push({ line: i + 1, code: l.trim() });
  }
});
console.log('5. SalesFunnelManager rendered only at:', funnelOccurrences);

const visaoStart = lines.findIndex(l => l.includes('activeTab === "visao-geral"'));
const visaoEnd = lines.findIndex((l, i) => i > visaoStart && l.includes('activeTab === "pedidos"'));
const visaoBlock = lines.slice(visaoStart, visaoEnd).join('\n');
console.log('6. Visão Geral contains Funnel or its cards?:', visaoBlock.includes('SalesFunnel') || visaoBlock.includes('Gargalo'));

const funilStart = lines.findIndex(l => l.includes('activeTab === "funil"'));
console.log('7. Funil tab condition line:', funilStart + 1);

console.log('8. Root container has fixed inset-0 overflow-hidden:', adminCode.includes('fixed inset-0 overflow-hidden'));
console.log('9. Main element has custom-scrollbar:', adminCode.includes('custom-scrollbar'));
console.log('10. Aside element has hide-scrollbar:', adminCode.includes('hide-scrollbar'));
