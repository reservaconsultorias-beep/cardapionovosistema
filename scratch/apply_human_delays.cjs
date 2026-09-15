const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function applyDelays() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  // 1. SAFETY CHECK: Model MUST be Gemini Flash 2.5 on OpenRouter
  const modelNode = wf.nodes.find(n => n.name === 'OpenRouter Chat Model' || (n.type.includes('OpenRouter') || n.type.includes('openRouter')));
  if (!modelNode || !modelNode.parameters?.model?.includes('gemini-2.5-flash')) {
    throw new Error('ABORT: Model check failed! Expected google/gemini-2.5-flash. Found: ' + JSON.stringify(modelNode));
  }
  console.log('✓ Model check verified: google/gemini-2.5-flash preserved untouched.');

  // 2. Update Delay Humano
  const delayHumano = wf.nodes.find(n => n.name === 'Delay Humano');
  if (!delayHumano) {
    throw new Error('ABORT: Node "Delay Humano" not found!');
  }
  const oldDelay = JSON.stringify(delayHumano.parameters);
  delayHumano.parameters = {
    amount: "={{ Math.min(16, Math.max(5, 3 + Math.round((($json.output || '').length) / 25))) }}"
  };
  console.log('✓ "Delay Humano" updated from', oldDelay, 'to', JSON.stringify(delayHumano.parameters));

  // 3. Update DELAY 1 SEGUNDO (delay between split messages)
  const delay1s = wf.nodes.find(n => n.name === 'DELAY 1 SEGUNDO');
  if (delay1s) {
    delay1s.parameters = {
      amount: 2
    };
    console.log('✓ "DELAY 1 SEGUNDO" updated to 2 seconds.');
  }

  // 4. Update Envia mensagem para o WhatsApp options_message
  const sendNode = wf.nodes.find(n => n.name === 'Envia mensagem para o WhatsApp');
  if (sendNode) {
    sendNode.parameters.options_message = {
      delay: 1200
    };
    console.log('✓ "Envia mensagem para o WhatsApp" options_message updated with delay: 1200ms (typing indicator).');
  }

  // 5. Send update to n8n
  const putPayload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: {
      executionOrder: 'v1',
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
      saveManualExecutions: true
    }
  };

  const putRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(putPayload)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error('Failed to update workflow: ' + putRes.status + ' ' + errText);
  }

  console.log('✓ Workflow successfully updated on n8n!');

  // 6. Ensure active
  const actRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('Activation response status:', actRes.status);
}

applyDelays().catch(console.error);
