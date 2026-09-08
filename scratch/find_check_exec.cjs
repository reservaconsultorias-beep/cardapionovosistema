const fs = require('fs');
const path = 'C:/Users/herek/.gemini/antigravity-ide/brain/f9da4e05-7c23-44f5-89e3-672e34d0b952/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(path, 'utf8').trim().split('\n');

for (let i = 1271; i < lines.length; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.content && (obj.content.includes('check_main_blocks') || obj.content.includes('find_kpis'))) {
      console.log(`Step ${obj.step_index}: ${obj.type} -> ${obj.content.substring(0, 200)}`);
    }
  } catch(e) {}
}
