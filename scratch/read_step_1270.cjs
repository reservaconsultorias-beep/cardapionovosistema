const fs = require('fs');
const path = 'C:/Users/herek/.gemini/antigravity-ide/brain/f9da4e05-7c23-44f5-89e3-672e34d0b952/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(path, 'utf8').trim().split('\n');

for (let i = 1200; i <= 1270; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.type === 'PLANNER_RESPONSE' && obj.content && obj.content.length > 50) {
      console.log(`--- Step ${obj.step_index} Planner Response ---`);
      console.log(obj.content);
    } else if (obj.type === 'CODE_ACTION') {
      console.log(`--- Step ${obj.step_index} Code Action ---`);
      console.log(obj.content);
    }
  } catch(e) {}
}
