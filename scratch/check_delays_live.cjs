const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function checkDelays() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  console.log('=== WORKFLOW INFO ===');
  console.log('Name:', wf.name);
  console.log('Active:', wf.active);

  // Filter nodes with wait, delay, or related to message sending
  const waitNodes = wf.nodes.filter(n => n.type.includes('wait') || n.name.toLowerCase().includes('delay') || n.name.toLowerCase().includes('pausa'));
  console.log('\n=== WAIT / DELAY NODES ===');
  waitNodes.forEach(n => {
    console.log(`- [${n.name}] (type: ${n.type}):`, JSON.stringify(n.parameters, null, 2));
  });

  // Check AGENTE DE I.A. connections
  console.log('\n=== AGENTE DE I.A. CONNECTIONS ===');
  console.log(JSON.stringify(wf.connections['AGENTE DE I.A.'], null, 2));

  // Check Delay Humano connections
  console.log('\n=== DELAY HUMANO CONNECTIONS ===');
  console.log(JSON.stringify(wf.connections['Delay Humano'], null, 2));

  // Check SEPARA MENSAGENS connections
  console.log('\n=== SEPARA MENSAGENS / EVOLUTION CONNECTIONS ===');
  console.log(JSON.stringify(wf.connections['SEPARA MENSAGENS2'] || wf.connections['SEPARA MENSAGENS'], null, 2));

  // Check Evolution / Send message nodes
  const sendNodes = wf.nodes.filter(n => n.name.toLowerCase().includes('enviar') || n.name.toLowerCase().includes('evolution') || n.name.toLowerCase().includes('texto'));
  console.log('\n=== SEND NODES ===');
  sendNodes.forEach(n => {
    console.log(`- [${n.name}] (type: ${n.type}):`, JSON.stringify(n.parameters, null, 2));
  });
}

checkDelays().catch(console.error);
