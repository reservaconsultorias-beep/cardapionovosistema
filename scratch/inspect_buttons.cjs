const fs = require('fs');
const content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Check desktop sidebar
const desktopSidebarMatch = content.match(/<aside[\s\S]*?<\/aside>/);
if (desktopSidebarMatch) {
  console.log('--- DESKTOP SIDEBAR BUTTONS ---');
  const asideContent = desktopSidebarMatch[0];
  const btnMatches = asideContent.matchAll(/setActiveTab\(["']([^"']+)["']\)[^>]*>([\s\S]*?)<\/button>/g);
  for (const m of btnMatches) {
    const tab = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    console.log(`Tab: ${tab} | Label: ${text}`);
  }
}

// Check mobile drawer
const mobileDrawerMatch = content.match(/{\/\* Mobile Sidebar Modal Drawer \*\/}[\s\S]*?<\/div>\s*<\/div>\s*\)/);
if (mobileDrawerMatch) {
  console.log('\n--- MOBILE DRAWER BUTTONS ---');
  const drawerContent = mobileDrawerMatch[0];
  const btnMatches = drawerContent.matchAll(/setActiveTab\(["']([^"']+)["']\)[^>]*>([\s\S]*?)<\/button>/g);
  for (const m of btnMatches) {
    const tab = m[1];
    const text = m[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
    console.log(`Tab: ${tab} | Label: ${text}`);
  }
}
