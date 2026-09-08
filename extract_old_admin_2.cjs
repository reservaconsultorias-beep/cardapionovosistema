const fs = require('fs');
const transcriptPath = 'C:\\Users\\herek\\.gemini\\antigravity-ide\\brain\\846f1640-228e-44c2-bc9d-a59222cf447b\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (const line of lines) {
  if (line.includes('Filtro')) {
    try {
      const parsed = JSON.parse(line);
      const content = parsed.content || '';
      if (content.includes('relatorios')) {
         fs.appendFileSync('old_admin_chunks.txt', content + '\n\n-----------------\n\n');
      }
    } catch(e) {}
  }
}
console.log("Done");
