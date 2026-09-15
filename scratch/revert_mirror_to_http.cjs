const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function revertCodeToHttp() {
  console.log('1. Obtendo workflow...');
  const res = await fetch('https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/' + workflowId, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  const wf = data.data || data;

  const nodeCliente = wf.nodes.find(n => n.name === 'Espelho: Registra Cliente');
  const nodeBot = wf.nodes.find(n => n.name === 'Espelho: Registra Bot');

  // 1. Espelho Cliente como HTTP Request nativo no Supabase REST API (sem task runner)
  if (nodeCliente) {
    nodeCliente.type = 'n8n-nodes-base.httpRequest';
    nodeCliente.typeVersion = 4.2;
    nodeCliente.parameters = {
      method: 'POST',
      url: 'https://tipnhvpivhaerumetona.supabase.co/rest/v1/settings',
      authentication: 'none',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey', value: 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat' },
          { name: 'Authorization', value: 'Bearer sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat' },
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'resolution=merge-duplicates' }
        ]
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        key: 'chat_conversation_' + String($('Coleta').item.json.telefone || '').replace(/\\D/g, ''),
        value: {
          phone: String($('Coleta').item.json.telefone || '').replace(/\\D/g, ''),
          name: $('Coleta').item.json.nome || 'Cliente',
          paused: false,
          last_message: $('Coleta').item.json.mensagem || '',
          last_sender: 'client',
          updated_at: new Date().toISOString(),
          messages: [{
            id: String(Date.now()),
            sender: 'client',
            text: $('Coleta').item.json.mensagem || '',
            timestamp: new Date().toISOString()
          }]
        },
        updated_at: new Date().toISOString()
      }) }}`,
      options: { timeout: 3000 }
    };
    nodeCliente.continueOnFail = true;
  }

  // 2. Conecta Coleta -> Espelho: Registra Cliente -> Verifica tipo de arquivo
  console.log('2. Ajustando conexões diretas e ultrarrápidas...');
  wf.connections['Coleta'] = {
    main: [[{ node: 'Espelho: Registra Cliente', type: 'main', index: 0 }]]
  };
  wf.connections['Espelho: Registra Cliente'] = {
    main: [[{ node: 'Verifica tipo de arquivo', type: 'main', index: 0 }]]
  };

  // 3. Espelho Bot como HTTP Request nativo
  if (nodeBot) {
    nodeBot.type = 'n8n-nodes-base.httpRequest';
    nodeBot.typeVersion = 4.2;
    nodeBot.parameters = {
      method: 'POST',
      url: 'https://tipnhvpivhaerumetona.supabase.co/rest/v1/settings',
      authentication: 'none',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey', value: 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat' },
          { name: 'Authorization', value: 'Bearer sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat' },
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'resolution=merge-duplicates' }
        ]
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        key: 'chat_conversation_' + String($('Coleta').item.json.telefone || '').replace(/\\D/g, ''),
        value: {
          phone: String($('Coleta').item.json.telefone || '').replace(/\\D/g, ''),
          name: $('Coleta').item.json.nome || 'Cliente',
          paused: false,
          last_message: $json.item || $('AGENTE DE I.A.').item?.json?.output || '',
          last_sender: 'bot',
          updated_at: new Date().toISOString(),
          messages: [{
            id: String(Date.now()),
            sender: 'bot',
            text: $json.item || $('AGENTE DE I.A.').item?.json?.output || '',
            timestamp: new Date().toISOString()
          }]
        },
        updated_at: new Date().toISOString()
      }) }}`,
      options: { timeout: 3000 }
    };
    nodeBot.continueOnFail = true;
  }

  // Envia atualização para o n8n
  console.log('3. Enviando PUT para o n8n...');
  const putRes = await fetch('https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/' + workflowId, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey
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
  console.log('PUT STATUS:', putRes.status);
  const actRes = await fetch('https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/' + workflowId + '/activate', {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('ACTIVATE STATUS:', actRes.status);
  console.log('Workflow atualizado com nós nativos HTTP!');
}

revertCodeToHttp().catch(console.error);
