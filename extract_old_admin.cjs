import fs from 'fs';

const transcriptPath = 'C:\\Users\\herek\\.gemini\\antigravity-ide\\brain\\846f1640-228e-44c2-bc9d-a59222cf447b\\.system_generated\\logs\\transcript_full.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (const line of lines) {
  if (line.includes('"output":')) {
    try {
      const parsed = JSON.parse(line);
      const output = parsed.content || '';
      if (output.includes('AdminDashboard.tsx') && output.includes('activeTab === "relatorios"')) {
         // this might be it. let's just dump all text that looks like the file content
         fs.appendFileSync('old_admin_chunks.txt', output + '\n\n-----------------\n\n');
      }
    } catch(e) {}
  }
}
console.log("Done");
