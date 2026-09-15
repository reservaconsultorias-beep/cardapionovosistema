const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function checkIndividualPauseInWorkflow() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  console.log('Nodes in workflow:');
  wf.nodes.forEach(n => {
    if (n.name.toLowerCase().includes('bot') || n.name.toLowerCase().includes('status') || n.name.toLowerCase().includes('pausa')) {
      console.log(`- [${n.name}] type: ${n.type}`);
    }
  });
}

checkIndividualPauseInWorkflow().catch(console.error);
