const apiKey = process.env.N8N_API_KEY;

async function checkRecentExecs() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/executions?limit=10`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const execs = data.data || [];
  console.log('Recent executions:');
  execs.forEach(e => {
    console.log(`- Exec ID: ${e.id} | Workflow ID: ${e.workflowId} | Status: ${e.status} | Finished: ${e.finished} | Mode: ${e.mode} | StartedAt: ${e.startedAt}`);
  });
}

checkRecentExecs().catch(console.error);
