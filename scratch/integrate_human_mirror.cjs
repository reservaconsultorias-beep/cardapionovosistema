const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function integrateHumanMirror() {
  console.log('1. Buscando workflow atual...');
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  if (wf.nodes.some(n => n.name === 'Coleta Humano')) {
    console.log('Nós de espelho humano já existem!');
    return;
  }

  console.log('2. Criando nós para espelhar mensagens humanas...');
  const nodeColetaHumano = {
    parameters: {
      assignments: {
        assignments: [
          {
            id: 'c-nome-humano',
            name: 'nome',
            value: "={{ $('Recebe mensagem').item.json.body.data?.pushName ?? $('Recebe mensagem').item.json.body?.data?.message?.pushName ?? $('Recebe mensagem').item.json.data?.message?.pushName ?? 'Você' }}",
            type: 'string'
          },
          {
            id: 'c-tel-humano',
            name: 'telefone',
            value: "={{ $('Recebe mensagem').item.json.body.data?.key?.remoteJid ?? $('Recebe mensagem').item.json.body?.data?.message?.key?.remoteJid ?? $('Recebe mensagem').item.json.data?.message?.key?.remoteJid }}",
            type: 'string'
          },
          {
            id: 'c-msg-humano',
            name: 'mensagem',
            value: "={{ $('Recebe mensagem').item.json.body.data?.message?.conversation ?? $('Recebe mensagem').item.json.body?.data?.message?.message?.conversation ?? $('Recebe mensagem').item.json.data?.message?.message?.conversation ?? $('Recebe mensagem').item.json.body.data?.message?.extendedTextMessage?.text ?? $('Recebe mensagem').item.json.body?.data?.message?.message?.extendedTextMessage?.text ?? $('Recebe mensagem').item.json.data?.message?.message?.extendedTextMessage?.text ?? '[Arquivo/Midia]' }}",
            type: 'string'
          }
        ]
      }
    },
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [2976, 1680],
    id: 'coleta-humano-id',
    name: 'Coleta Humano'
  };

  const nodeEspelhoHumano = {
    parameters: {
      method: 'POST',
      url: 'https://41menuspizzaria.netlify.app/.netlify/functions/chat-mirror',
      authentication: 'none',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: 'Bearer SenhaSuperSecreta41Menus2026' },
          { name: 'Content-Type', value: 'application/json' }
        ]
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: `={{ JSON.stringify({
        phone: String($('Coleta Humano').item.json.telefone || '').replace(/\\D/g, ''),
        name: $('Coleta Humano').item.json.nome || 'Cliente',
        sender: 'human',
        text: $('Coleta Humano').item.json.mensagem || ''
      }) }}`,
      options: { timeout: 4000 }
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [3200, 1680],
    id: 'espelho-registra-humano',
    name: 'Espelho: Registra Humano',
    continueOnFail: true
  };

  wf.nodes.push(nodeColetaHumano, nodeEspelhoHumano);

  if (!wf.connections['If']) wf.connections['If'] = { main: [[], []] };
  if (!wf.connections['If'].main[1]) wf.connections['If'].main[1] = [];

  // Conecta o IF (false) para Coleta Humano
  wf.connections['If'].main[1].push({ node: 'Coleta Humano', type: 'main', index: 0 });
  
  wf.connections['Coleta Humano'] = {
    main: [[{ node: 'Espelho: Registra Humano', type: 'main', index: 0 }]]
  };

  console.log('3. Salvando workflow...');
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

  console.log('4. Reativando workflow...');
  await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });

  console.log('Sucesso! Agora mensagens respondidas pelo seu celular oficial irao para o espelho como sender: human.');
}

integrateHumanMirror().catch(console.error);
