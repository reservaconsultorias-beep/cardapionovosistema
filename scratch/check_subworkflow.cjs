const apiKey = process.env.N8N_API_KEY;
const subWorkflowId = 'VprlYWNCoc5EcUED';

async function checkSubWorkflow() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${subWorkflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;
  console.log('Sub-Workflow Name:', wf.name);
  console.log('Active:', wf.active);
  console.log('Nodes:', wf.nodes.map(n => ({ name: n.name, type: n.type })));

  const httpNodes = wf.nodes.filter(n => n.type.includes('http'));
  console.log('HTTP Nodes:', JSON.stringify(httpNodes.map(n => ({ name: n.name, parameters: n.parameters })), null, 2));
}

checkSubWorkflow().catch(console.error);
