const fs = require('fs');
const path = 'C:/Users/herek/.gemini/antigravity-ide/brain/f9da4e05-7c23-44f5-89e3-672e34d0b952/.system_generated/logs/transcript.jsonl';
const lines = fs.readFileSync(path, 'utf8').trim().split('\n');

for (let i = 1271; i <= 1451; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    if (obj.type === 'CODE_ACTION' || obj.type === 'RUN_COMMAND' || obj.type === 'PLANNER_RESPONSE') {
      if (obj.type === 'PLANNER_RESPONSE' && obj.content && obj.content.length > 30) {
        console.log(`[Step ${obj.step_index}] PLANNER_RESPONSE: ${obj.content.substring(0, 150).replace(/\n/g, ' ')}`);
      } else if (obj.type === 'CODE_ACTION') {
        console.log(`[Step ${obj.step_index}] CODE_ACTION: ${obj.content.substring(0, 150).replace(/\n/g, ' ')}`);
      }
    }
  } catch(e) {}
}
