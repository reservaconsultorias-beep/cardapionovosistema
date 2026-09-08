const fs = require('fs');
const path = 'C:/Users/herek/.gemini/antigravity-ide/brain/f9da4e05-7c23-44f5-89e3-672e34d0b952/.system_generated/logs/transcript.jsonl';
if (!fs.existsSync(path)) { 
  console.log('File not found'); 
  process.exit(0); 
}

const lines = fs.readFileSync(path, 'utf8').trim().split('\n');
console.log('Total transcript lines:', lines.length);

for (let i = Math.max(0, lines.length - 20); i < lines.length; i++) {
  try {
    const obj = JSON.parse(lines[i]);
    const summary = {
      step: obj.step_index,
      type: obj.type,
      source: obj.source,
      contentSnippet: obj.content ? obj.content.substring(0, 120).replace(/\n/g, ' ') : ''
    };
    console.log(JSON.stringify(summary));
  } catch(e) {}
}
