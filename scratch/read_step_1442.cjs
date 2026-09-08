const fs = require('fs');
const path = 'C:/Users/herek/.gemini/antigravity-ide/brain/f9da4e05-7c23-44f5-89e3-672e34d0b952/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(path, 'utf8').trim().split('\n');

for (let i = 1430; i <= 1450; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.step_index === 1442) {
      console.log(obj.content);
    }
  } catch(e) {}
}
