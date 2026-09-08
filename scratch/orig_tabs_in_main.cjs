const fs = require('fs');
const orig = fs.readFileSync('scratch/original_admin.tsx', 'utf8');
const lines = orig.split('\n');

const mainStart = lines.findIndex(l => l.includes('<main'));
const mainEnd = lines.findIndex(l => l.includes('</main>'));

console.log('Original main: lines', mainStart + 1, 'to', mainEnd + 1);

for (let i = mainStart; i <= mainEnd; i++) {
  const line = lines[i];
  if (line.includes('activeTab ===')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
}
