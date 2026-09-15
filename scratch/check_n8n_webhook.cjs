const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function check() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;
  console.log('Workflow Name:', wf.name);
  console.log('Active:', wf.active);
  
  const webhookNodes = wf.nodes.filter(n => n.type.toLowerCase().includes('webhook') || n.name.toLowerCase().includes('recebe'));
  console.log('Webhook nodes found:', webhookNodes.map(n => ({ name: n.name, type: n.type, parameters: n.parameters, webhookId: n.webhookId })));
}

check().catch(console.error);
