const fs = require('fs');
const lines = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (line.includes('hasPermission') || line.includes('currentUser') || line.includes('isOwner')) {
    if (idx < 500) {
      console.log(`L${idx+1}: ${line}`);
    }
  }
});
