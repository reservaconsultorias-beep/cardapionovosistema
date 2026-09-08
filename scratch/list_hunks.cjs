const cp = require('child_process');
const fs = require('fs');

const diff = cp.execSync('git diff a0c5ca6 src/pages/AdminDashboard.tsx', { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

// Let's find all the hunk headers @@ -x,y +a,b @@
const hunkRegex = /@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/g;
let match;
const hunks = [];
while ((match = hunkRegex.exec(diff)) !== null) {
  hunks.push({
    origStart: parseInt(match[1]),
    origLen: parseInt(match[2] || '1'),
    currStart: parseInt(match[3]),
    currLen: parseInt(match[4] || '1'),
    header: match[0],
    index: match.index
  });
}

console.log('Total hunks:', hunks.length);
hunks.forEach((h, i) => {
  const nextIndex = i < hunks.length - 1 ? hunks[i+1].index : diff.length;
  const chunkText = diff.slice(h.index, nextIndex);
  const firstLines = chunkText.split('\n').slice(0, 5).join('\n');
  console.log(`\nHunk ${i+1}: Curr lines ~${h.currStart} (+${h.currLen} / -${h.origLen})`);
  console.log(firstLines);
});
