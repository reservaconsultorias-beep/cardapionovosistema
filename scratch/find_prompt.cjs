const fs = require('fs');
const path = 'C:/Users/herek/.gemini/antigravity-ide/brain/f9da4e05-7c23-44f5-89e3-672e34d0b952/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(path, 'utf8').trim().split('\n');

for (let i = 0; i < lines.length; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.content && obj.content.includes('duplicado as opçoes')) {
      console.log('Found user prompt at step:', obj.step_index, 'line:', i);
      for (let j = Math.max(0, i - 15); j <= i; j++) {
        const prev = JSON.parse(lines[j]);
        console.log(`Step ${prev.step_index} | ${prev.type} | ${prev.source} | ${(prev.content || '').substring(0, 120).replace(/\n/g, ' ')}`);
      }
    }
  } catch(e) {}
}
