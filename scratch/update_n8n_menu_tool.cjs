const fs = require('fs');

const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function updateMenuTool() {
  console.log('Buscando workflow atual...');
  const res = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  const wf = data.data || data;
  
  const toolNode = wf.nodes.find(n => n.name === 'cardapio_41menus');
  if (!toolNode) throw new Error('Tool cardapio_41menus não encontrada no n8n!');

  console.log('URL antiga:', toolNode.parameters.url);
  toolNode.parameters.url = 'https://41menuspizzaria.netlify.app/.netlify/functions/agent-menu';
  console.log('Nova URL:', toolNode.parameters.url);

  console.log('Salvando workflow...');
  const putRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: {
        executionOrder: 'v1',
        saveDataErrorExecution: 'all',
        saveDataSuccessExecution: 'all',
        saveManualExecutions: true
      }
    })
  });

  if (!putRes.ok) throw new Error('Erro PUT: ' + await putRes.text());

  await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });

  console.log('SUCESSO! Ferramenta cardapio_41menus agora aponta para o Supabase via Netlify Function.');
}

updateMenuTool().catch(console.error);
