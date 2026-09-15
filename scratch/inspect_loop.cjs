const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function inspectLoop() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  function findNode(name) {
    return wf.nodes.find(n => n.name === name);
  }

  const sendWa = findNode('Envia mensagem para o WhatsApp');
  console.log('=== Envia mensagem para o WhatsApp ===');
  console.log('Type:', sendWa?.type);
  console.log('Params:', JSON.stringify(sendWa?.parameters, null, 2));
  console.log('Outputs to:', JSON.stringify(wf.connections['Envia mensagem para o WhatsApp'], null, 2));

  // Trace next nodes
  const next1 = wf.connections['Envia mensagem para o WhatsApp']?.main?.[0]?.[0]?.node;
  if (next1) {
    console.log(`\n=== Next Node: [${next1}] ===`);
    const node1 = findNode(next1);
    console.log('Type:', node1?.type);
    console.log('Params:', JSON.stringify(node1?.parameters, null, 2));
    console.log('Outputs to:', JSON.stringify(wf.connections[next1], null, 2));
  }

  // Also check PAUSA DE 7 SEGUNDOS - where is it in the flow?
  console.log('\n=== PAUSA DE 7 SEGUNDOS ===');
  console.log('Inputs coming from:', Object.entries(wf.connections).filter(([from, c]) => {
    return JSON.stringify(c).includes('PAUSA DE 7 SEGUNDOS');
  }).map(([from]) => from));
  console.log('Outputs to:', JSON.stringify(wf.connections['PAUSA DE 7 SEGUNDOS'], null, 2));

  // Also check DELAY 1 SEGUNDO - where is it in the flow?
  console.log('\n=== DELAY 1 SEGUNDO ===');
  console.log('Inputs coming from:', Object.entries(wf.connections).filter(([from, c]) => {
    return JSON.stringify(c).includes('DELAY 1 SEGUNDO');
  }).map(([from]) => from));
  console.log('Outputs to:', JSON.stringify(wf.connections['DELAY 1 SEGUNDO'], null, 2));
}

inspectLoop().catch(console.error);
