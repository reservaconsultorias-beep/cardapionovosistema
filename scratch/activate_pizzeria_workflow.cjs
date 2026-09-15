const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function activate() {
  const actRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('Ativação do workflow principal status:', actRes.status);
  const data = await actRes.json();
  console.log('Resultado:', data);
}

activate().catch(console.error);
