const apiKey = process.env.N8N_API_KEY;

async function checkRecentExec() {
  const res = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/executions?limit=3`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  console.log(data);
}

checkRecentExec().catch(console.error);
