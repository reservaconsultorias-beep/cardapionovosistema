const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function updateMirrorNodes() {
  console.log('1. Obtendo workflow...');
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  const nodeCliente = wf.nodes.find(n => n.name === 'Espelho: Registra Cliente');
  const nodeBot = wf.nodes.find(n => n.name === 'Espelho: Registra Bot');
  const nodeVerificaPausa = wf.nodes.find(n => n.name === 'Verifica Pausa Chat');

  console.log('2. Atualizando nós de espelho e verificação de pausa...');

  if (nodeCliente) {
    nodeCliente.type = 'n8n-nodes-base.code';
    nodeCliente.typeVersion = 2;
    nodeCliente.parameters = {
      language: 'javaScript',
      jsCode: `
const phone = String($('Coleta').item.json.telefone || '').replace(/\\D/g, '');
const name = $('Coleta').item.json.nome || 'Cliente';
const text = $('Coleta').item.json.mensagem || '';

if (phone && text) {
  try {
    const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
    const anonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
    const convKey = 'chat_conversation_' + phone;

    let existing = {};
    try {
      const getRes = await this.helpers.httpRequest({
        method: 'GET',
        url: supabaseUrl + '/rest/v1/settings?key=eq.' + convKey + '&select=value',
        headers: {
          'apikey': anonKey,
          'Authorization': 'Bearer ' + anonKey
        },
        json: true
      });
      existing = getRes?.[0]?.value || {};
    } catch(e) {}

    const messages = Array.isArray(existing.messages) ? existing.messages : [];
    const newMsg = {
      id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender: 'client',
      text: text,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, newMsg].slice(-100);

    const updatedValue = {
      phone: phone,
      name: existing.name && existing.name !== 'Cliente' ? existing.name : name,
      paused: Boolean(existing.paused || false),
      paused_at: existing.paused_at || null,
      last_message: text,
      last_sender: 'client',
      updated_at: new Date().toISOString(),
      messages: updatedMessages
    };

    await this.helpers.httpRequest({
      method: 'POST',
      url: supabaseUrl + '/rest/v1/settings',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: {
        key: convKey,
        value: updatedValue,
        updated_at: new Date().toISOString()
      },
      json: true
    });
  } catch (err) {
    // silencioso
  }
}

return $input.all();
`
    };
  }

  // Verifica Pausa Chat: Code node seguro que NUNCA descarta o item se o Supabase retornar vazio
  if (nodeVerificaPausa) {
    nodeVerificaPausa.type = 'n8n-nodes-base.code';
    nodeVerificaPausa.typeVersion = 2;
    nodeVerificaPausa.parameters = {
      language: 'javaScript',
      jsCode: `
const phone = String($('Coleta').item.json.telefone || '').replace(/\\D/g, '');
let isPaused = false;

if (phone) {
  try {
    const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
    const anonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
    const convKey = 'chat_conversation_' + phone;

    const res = await this.helpers.httpRequest({
      method: 'GET',
      url: supabaseUrl + '/rest/v1/settings?key=eq.' + convKey + '&select=value',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey
      },
      json: true
    });
    const val = res?.[0]?.value;
    if (val && val.paused === true) {
      isPaused = true;
    }
  } catch(e) {}
}

// Retorna item preservado com flag isPaused
return [{
  json: {
    ...$input.first().json,
    isChatPaused: isPaused
  }
}];
`
    };
  }

  // Ajusta o IF 'Chat Pausado?' para testar json.isChatPaused
  const nodeChatPausadoIf = wf.nodes.find(n => n.name === 'Chat Pausado?');
  if (nodeChatPausadoIf) {
    nodeChatPausadoIf.parameters = {
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
            leftValue: '={{ $json.isChatPaused === true }}',
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
    };
  }

  // Ajusta Espelho Bot
  if (nodeBot) {
    nodeBot.type = 'n8n-nodes-base.code';
    nodeBot.typeVersion = 2;
    nodeBot.parameters = {
      language: 'javaScript',
      jsCode: `
const phone = String($('Coleta').item.json.telefone || '').replace(/\\D/g, '');
const name = $('Coleta').item.json.nome || 'Cliente';
const text = $json.item || $('AGENTE DE I.A.').item?.json?.output || '';

if (phone && text) {
  try {
    const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
    const anonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
    const convKey = 'chat_conversation_' + phone;

    let existing = {};
    try {
      const getRes = await this.helpers.httpRequest({
        method: 'GET',
        url: supabaseUrl + '/rest/v1/settings?key=eq.' + convKey + '&select=value',
        headers: {
          'apikey': anonKey,
          'Authorization': 'Bearer ' + anonKey
        },
        json: true
      });
      existing = getRes?.[0]?.value || {};
    } catch(e) {}

    const messages = Array.isArray(existing.messages) ? existing.messages : [];
    const newMsg = {
      id: Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender: 'bot',
      text: text,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, newMsg].slice(-100);

    const updatedValue = {
      phone: phone,
      name: existing.name || name,
      paused: Boolean(existing.paused || false),
      paused_at: existing.paused_at || null,
      last_message: text,
      last_sender: 'bot',
      updated_at: new Date().toISOString(),
      messages: updatedMessages
    };

    await this.helpers.httpRequest({
      method: 'POST',
      url: supabaseUrl + '/rest/v1/settings',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: {
        key: convKey,
        value: updatedValue,
        updated_at: new Date().toISOString()
      },
      json: true
    });
  } catch(e) {}
}

return $input.all();
`
    };
  }

  console.log('3. Salvando workflow...');
  const putRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
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
  if (!putRes.ok) {
    console.error(await putRes.text());
    return;
  }

  console.log('4. Reativando workflow...');
  const actRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('ACTIVATE STATUS:', actRes.status);
  console.log('Concluído com sucesso!');
}

updateMirrorNodes().catch(console.error);
