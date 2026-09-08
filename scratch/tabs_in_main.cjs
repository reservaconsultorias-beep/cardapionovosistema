const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const lines = content.split('\n');

const mainStart = lines.findIndex(l => l.includes('<main'));
const mainEnd = lines.findIndex(l => l.includes('</main>'));

console.log('main starts at line:', mainStart + 1, 'ends at line:', mainEnd + 1);

for (let i = mainStart; i <= mainEnd; i++) {
  const line = lines[i];
  if (line.includes('activeTab ===')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}
