const fs = require('fs');
const path = require('path');

function searchAll(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = path.join(dir, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'dist') searchAll(p);
    } else if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.json') || f.endsWith('.cjs')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes('431') || c.includes('66.21') || c.includes('Da Casa (Gr)')) {
        console.log(`FOUND MATCH IN FILE: ${p}`);
        const lines = c.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('431') || l.includes('66.21') || l.includes('Da Casa')) {
            console.log(`  L${idx + 1}: ${l.trim().slice(0, 120)}`);
          }
        });
      }
    }
  }
}

searchAll('.');
