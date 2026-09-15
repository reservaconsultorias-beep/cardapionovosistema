const apiKey = process.env.N8N_API_KEY;

async function checkPg() {
  const query = `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
  const webhookPath = 'check-pg-' + Date.now();

  const wfPayload = {
    name: 'Temp PG Checker',
    nodes: [
      {
        parameters: { httpMethod: 'POST', path: webhookPath, responseMode: 'responseNode', options: {} },
        type: 'n8n-nodes-base.webhook',
        typeVersion: 2,
        position: [200, 300],
        id: 'node-webhook',
        name: 'Webhook'
      },
      {
        parameters: { operation: 'executeQuery', query: query, options: {} },
        type: 'n8n-nodes-base.postgres',
        typeVersion: 2.6,
        position: [420, 300],
        id: 'node-postgres',
        name: 'Postgres Supabase',
        credentials: { postgres: { id: 'nnC874tjLWizL2l9', name: 'postgres_supabase' } }
      },
      {
        parameters: { respondWith: 'allIncomingItems', options: {} },
        type: 'n8n-nodes-base.respondToWebhook',
        typeVersion: 1.1,
        position: [640, 300],
        id: 'node-respond',
        name: 'Respond to Webhook'
      }
    ],
    connections: {
      Webhook: { main: [[{ node: 'Postgres Supabase', type: 'main', index: 0 }]] },
      'Postgres Supabase': { main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]] }
    },
    settings: { executionOrder: 'v1' }
  };

  const createRes = await fetch('https://funnyeagle-n8n.cloudfy.live/api/v1/workflows', {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(wfPayload)
  });
  const createJson = await createRes.json();
  const createdWf = createJson.data || createJson;
  const tempWfId = createdWf.id;

  await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${tempWfId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });

  const triggerRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/webhook/${webhookPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const res = await triggerRes.json();
  console.log('Tables in public schema:');
  console.log(res.map(r => r.table_name));

  await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${tempWfId}`, {
    method: 'DELETE',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
}

checkPg().catch(console.error);
