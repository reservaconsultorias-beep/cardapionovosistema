const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function integrateMirrorAndIndividualPause() {
  console.log('1. Buscando workflow atual...');
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  // Verifica se os nós de espelho já existem
  if (wf.nodes.some(n => n.name === 'Espelho: Registra Cliente')) {
    console.log('Os nós de espelho já existem no workflow.');
    return;
  }

  console.log('2. Criando nós de espelho e verificação de pausa individual...');

  // Nó 1: Registra mensagem recebida do cliente no espelho
  const nodeEspelhoCliente = {
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
        phone: String($('Coleta').item.json.telefone || '').replace(/\\D/g, ''),
        name: $('Coleta').item.json.nome || 'Cliente',
        sender: 'client',
        text: $('Coleta').item.json.mensagem || ''
      }) }}`,
      options: { timeout: 4000 }
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [3200, 800],
    id: 'espelho-registra-cliente-http',
    name: 'Espelho: Registra Cliente',
    continueOnFail: true
  };

  // Nó 2: Verifica se este chat específico está pausado
  const nodeVerificaPausaIndividual = {
    parameters: {
      url: "=https://tipnhvpivhaerumetona.supabase.co/rest/v1/settings?key=eq.chat_conversation_{{ String($('Coleta').item.json.telefone || '').replace(/\\D/g, '') }}&select=value",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'apikey', value: 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat' },
          { name: 'Authorization', value: 'Bearer sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat' }
        ]
      },
      options: { timeout: 4000 }
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [3380, 800],
    id: 'verifica-pausa-individual-http',
    name: 'Verifica Pausa Chat',
    continueOnFail: true
  };

  // Nó 3: If para checar se o chat específico está pausado
  const nodeChatPausadoIf = {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'loose',
          version: 2
        },
        conditions: [
          {
            id: 'chat-paused-condition',
            leftValue: "={{ $json[0]?.value?.paused === true || $json.value?.paused === true }}",
            rightValue: '',
            operator: {
              type: 'boolean',
              operation: 'true',
              singleValue: true
            }
          }
        ],
        combinator: 'and'
      },
      options: {}
    },
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [3560, 800],
    id: 'chat-pausado-if',
    name: 'Chat Pausado?'
  };

  // Nó 4: Registra resposta da Giovanna no espelho (após envio ao WhatsApp)
  const nodeEspelhoBot = {
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
        phone: String($('Coleta').item.json.telefone || '').replace(/\\D/g, ''),
        name: $('Coleta').item.json.nome || 'Cliente',
        sender: 'bot',
        text: $json.item || $('AGENTE DE I.A.').item.json.output || ''
      }) }}`,
      options: { timeout: 4000 }
    },
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: [6800, 1008],
    id: 'espelho-registra-bot-http',
    name: 'Espelho: Registra Bot',
    continueOnFail: true
  };

  // Adiciona nós ao workflow
  wf.nodes.push(nodeEspelhoCliente, nodeVerificaPausaIndividual, nodeChatPausadoIf, nodeEspelhoBot);

  // Conexões:
  // Anterior: Coleta -> Verifica tipo de arquivo
  // Novo: Coleta -> Espelho: Registra Cliente -> Verifica Pausa Chat -> Chat Pausado?
  // Chat Pausado? -> Saída False (0 / Não pausado): Verifica tipo de arquivo
  // (Se saída True/Pausado, simplesmente encerra a execução automática da IA sem responder!)
  wf.connections['Coleta'] = {
    main: [[{ node: 'Espelho: Registra Cliente', type: 'main', index: 0 }]]
  };
  wf.connections['Espelho: Registra Cliente'] = {
    main: [[{ node: 'Verifica Pausa Chat', type: 'main', index: 0 }]]
  };
  wf.connections['Verifica Pausa Chat'] = {
    main: [[{ node: 'Chat Pausado?', type: 'main', index: 0 }]]
  };
  wf.connections['Chat Pausado?'] = {
    main: [
      [], // Saída True (Pausado): Não faz nada, humano atende
      [{ node: 'Verifica tipo de arquivo', type: 'main', index: 0 }] // Saída False (Não pausado): segue fluxo da IA
    ]
  };

  // Conexão após envio de WhatsApp da Giovanna -> Espelho: Registra Bot
  wf.connections['DELAY 1 SEGUNDO'] = {
    main: [[{ node: 'Espelho: Registra Bot', type: 'main', index: 0 }]]
  };
  wf.connections['Espelho: Registra Bot'] = {
    main: [[{ node: 'Loop Over Items1', type: 'main', index: 0 }]]
  };

  console.log('3. Salvando workflow atualizado no n8n...');
  const payload = {
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
    body: JSON.stringify(payload)
  });

  if (!putRes.ok) {
    throw new Error('Erro no PUT n8n: ' + putRes.status + ' ' + (await putRes.text()));
  }

  console.log('4. Reativando workflow no n8n...');
  await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });

  console.log('🎉 SUCESSO! Espelho de mensagens e pausa individual integrados 100% ao workflow da Giovanna!');
}

integrateMirrorAndIndividualPause().catch(console.error);
