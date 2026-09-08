const fs = require('fs');
const orig = fs.readFileSync('scratch/original_admin.tsx', 'utf8');
const curr = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Find all setActiveTab in original
const origTabs = [...orig.matchAll(/setActiveTab\(["']([^"']+)["']\)/g)].map(m => m[1]);
console.log('Original activeTab targets:', [...new Set(origTabs)]);

// Find all setActiveTab in current
const currTabs = [...curr.matchAll(/setActiveTab\(["']([^"']+)["']\)/g)].map(m => m[1]);
console.log('Current activeTab targets:', [...new Set(currTabs)]);

// Check original sidebar
const origAside = orig.match(/<aside[\s\S]*?<\/aside>/);
if (origAside) {
  console.log('\n--- ORIGINAL DESKTOP SIDEBAR BUTTONS ---');
  const btnMatches = origAside[0].matchAll(/setActiveTab\(["']([^"']+)["']\)[^>]*>([\s\S]*?)<\/button>/g);
  for (const m of btnMatches) {
    const tab = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    console.log(`Tab: ${tab} | Label: ${text}`);
  }
}
