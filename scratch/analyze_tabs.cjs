const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Let's inspect each activeTab block between line 1810 and 3000
const lines = content.split('\n');
const startLine = 1815;
const endLine = 2990;

console.log('Inspecting lines', startLine, 'to', endLine);

let depth = 0;
let currentTab = null;

for (let i = startLine - 1; i < endLine; i++) {
  const line = lines[i];
  const tabMatch = line.match(/\{activeTab === ["']([^"']+)["']/);
  if (tabMatch) {
    console.log(`\nLine ${i+1}: TAB START [${tabMatch[1]}] (current tab was: ${currentTab})`);
    currentTab = tabMatch[1];
  }
}
