const fs = require('fs');
const lines = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.includes('activeTab === "clientes"') || line.includes("activeTab === 'clientes'")) {
    console.log(`Line ${idx + 1}: ${line}`);
    console.log(lines.slice(idx, idx + 20).join('\n'));
    console.log('---');
  }
  if (line.includes('activeTab === "relatorios"') || line.includes("activeTab === 'relatorios'")) {
    console.log(`Line ${idx + 1}: ${line}`);
    console.log(lines.slice(idx, idx + 20).join('\n'));
    console.log('---');
  }
});
