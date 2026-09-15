const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function checkEvolutionSend() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  const sendNodes = wf.nodes.filter(n => n.name.toLowerCase().includes('envia mensagem') || n.type.includes('evolution'));
  console.log('Send nodes in workflow:', sendNodes.map(n => ({ name: n.name, parameters: n.parameters })));

  const afterSendConns = Object.entries(wf.connections).filter(([fromNode]) => fromNode.includes('Envia mensagem') || fromNode.includes('Loop'));
  console.log('Connections around send:', JSON.stringify(afterSendConns, null, 2));
}

checkEvolutionSend().catch(console.error);
