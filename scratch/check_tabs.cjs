const fs = require('fs');
const c = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
const matches = c.match(/activeTab === ['"][^'"]+['"]/g) || [];
console.log([...new Set(matches)]);
