const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function checkMirror() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  const mirrorNodes = wf.nodes.filter(n => 
    JSON.stringify(n).includes('chat-mirror') || 
    JSON.stringify(n).includes('chat_conversation') ||
    n.name.toLowerCase().includes('espelho') ||
    n.name.toLowerCase().includes('mirror')
  );

  console.log('Mirror nodes found:', mirrorNodes.map(n => ({ name: n.name, type: n.type })));

  const finalizarTool = wf.nodes.find(n => n.name === 'finalizar_pedido');
  console.log('finalizar_pedido tool parameters:', JSON.stringify(finalizarTool?.parameters, null, 2));
}

checkMirror().catch(console.error);
