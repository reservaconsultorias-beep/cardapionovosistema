const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function checkNodes() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  const botAtivo = wf.nodes.find(n => n.name === 'Bot Ativo?');
  const verificaStatus = wf.nodes.find(n => n.name === 'Verifica Status Bot');

  console.log('Verifica Status Bot:', JSON.stringify(verificaStatus, null, 2));
  console.log('Bot Ativo?:', JSON.stringify(botAtivo, null, 2));
}

checkNodes().catch(console.error);
