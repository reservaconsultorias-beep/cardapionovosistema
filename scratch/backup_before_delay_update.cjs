const fs = require('fs');
const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function backup() {
  const res = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  const wf = data.data || data;
  fs.writeFileSync('scratch/workflow_backup_pre_delay.json', JSON.stringify(wf, null, 2));
  console.log('Backup saved to scratch/workflow_backup_pre_delay.json');
}

backup().catch(console.error);
