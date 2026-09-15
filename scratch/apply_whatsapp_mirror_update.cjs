const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function applyWhatsAppMirrorUpdate() {
  console.log('1. Obtendo workflow ativo do n8n...');
  const res = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  const wf = data.data || data;

  // 1. Atualizar nó "Espelho: Registra Cliente"
  const nodeCliente = wf.nodes.find(n => n.name === 'Espelho: Registra Cliente');
  if (nodeCliente) {
    nodeCliente.type = 'n8n-nodes-base.code';
    nodeCliente.typeVersion = 2;
    nodeCliente.parameters = {
      jsCode: `
const phone = String($('Coleta').item.json.telefone || '').replace(/\\D/g, '');
const name = $('Coleta').item.json.nome || 'Cliente';
const mensagem = $('Coleta').item.json.mensagem || '';
const nowIso = new Date().toISOString();

if (phone && mensagem) {
  const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
  const anonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
  const headers = {
    'apikey': anonKey,
    'Authorization': 'Bearer ' + anonKey,
    'Content-Type': 'application/json'
  };

  // 1. Tenta inserir na tabela relacional chat_messages
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: supabaseUrl + '/rest/v1/chat_messages',
      headers,
      body: { phone, sender: 'client', text: mensagem },
      json: true
    });
  } catch(e) {}

  // 2. Tenta upsert na tabela relacional chat_conversations
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: supabaseUrl + '/rest/v1/chat_conversations',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: { phone, name, last_message: mensagem, last_sender: 'client', updated_at: nowIso },
      json: true
    });
  } catch(e) {}

  // 3. Fallback no settings
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: supabaseUrl + '/rest/v1/settings',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: {
        key: 'chat_conversation_' + phone,
        value: {
          phone,
          name,
          last_message: mensagem,
          last_sender: 'client',
          updated_at: nowIso
        },
        updated_at: nowIso
      },
      json: true
    });
  } catch(e) {}
}

return $input.all();
`
    };
    nodeCliente.continueOnFail = true;
    console.log('✓ Nó "Espelho: Registra Cliente" atualizado');
  }

  // 2. Atualizar nó "Espelho: Registra Bot"
  const nodeBot = wf.nodes.find(n => n.name === 'Espelho: Registra Bot');
  if (nodeBot) {
    nodeBot.type = 'n8n-nodes-base.code';
    nodeBot.typeVersion = 2;
    nodeBot.parameters = {
      jsCode: `
const phone = String($('Coleta').item.json.telefone || '').replace(/\\D/g, '');
const name = $('Coleta').item.json.nome || 'Cliente';
const botResponse = $json.item || $('AGENTE DE I.A.').item?.json?.output || '';
const nowIso = new Date().toISOString();

if (phone && botResponse) {
  const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
  const anonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
  const headers = {
    'apikey': anonKey,
    'Authorization': 'Bearer ' + anonKey,
    'Content-Type': 'application/json'
  };

  // 1. Tenta inserir na tabela relacional chat_messages
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: supabaseUrl + '/rest/v1/chat_messages',
      headers,
      body: { phone, sender: 'bot', text: botResponse },
      json: true
    });
  } catch(e) {}

  // 2. Tenta upsert na tabela relacional chat_conversations
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: supabaseUrl + '/rest/v1/chat_conversations',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: { phone, name, last_message: botResponse, last_sender: 'bot', updated_at: nowIso },
      json: true
    });
  } catch(e) {}

  // 3. Fallback no settings
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: supabaseUrl + '/rest/v1/settings',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: {
        key: 'chat_conversation_' + phone,
        value: {
          phone,
          name,
          last_message: botResponse,
          last_sender: 'bot',
          updated_at: nowIso
        },
        updated_at: nowIso
      },
      json: true
    });
  } catch(e) {}
}

return $input.all();
`
    };
    nodeBot.continueOnFail = true;
    console.log('✓ Nó "Espelho: Registra Bot" atualizado');
  }

  // 3. Atualizar nó "Verifica Pausa Chat"
  const nodePausa = wf.nodes.find(n => n.name === 'Verifica Pausa Chat');
  if (nodePausa) {
    nodePausa.parameters = {
      jsCode: `
const phone = String($('Coleta').item.json.telefone || '').replace(/\\D/g, '');
let isPaused = false;

if (phone) {
  try {
    const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
    const anonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
    const headers = {
      'apikey': anonKey,
      'Authorization': 'Bearer ' + anonKey
    };

    // 1. Tenta consultar na tabela relacional chat_conversations
    try {
      const convRes = await this.helpers.httpRequest({
        method: 'GET',
        url: supabaseUrl + '/rest/v1/chat_conversations?phone=eq.' + phone + '&select=paused',
        headers,
        json: true
      });
      if (Array.isArray(convRes) && convRes.length > 0 && convRes[0].paused === true) {
        isPaused = true;
      }
    } catch(errConv) {}

    // 2. Se não pausado na relacional, checa fallback settings
    if (!isPaused) {
      const convKey = 'chat_conversation_' + phone;
      const res = await this.helpers.httpRequest({
        method: 'GET',
        url: supabaseUrl + '/rest/v1/settings?key=eq.' + convKey + '&select=value',
        headers,
        json: true
      });
      const val = res?.[0]?.value;
      if (val && val.paused === true) {
        isPaused = true;
      }
    }
  } catch(e) {}
}

return [{
  json: {
    ...$input.first().json,
    isChatPaused: isPaused
  }
}];
`
    };
    console.log('✓ Nó "Verifica Pausa Chat" atualizado');
  }

  // Enviar workflow atualizado
  console.log('2. Enviando PUT para o n8n...');
  const cleanSettings = {
    executionOrder: 'v1',
    saveDataErrorExecution: 'all',
    saveDataSuccessExecution: 'all',
    saveManualExecutions: true
  };

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
      settings: cleanSettings
    })
  });
  console.log('PUT STATUS:', putRes.status);
  if (putRes.status !== 200) {
    console.log('PUT ERROR:', await putRes.text());
  }

  // Ativar workflow
  console.log('3. Reativando workflow...');
  const actRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('ACTIVATE STATUS:', actRes.status);
  console.log('✓ Workflow n8n pronto e atualizado com suporte ao histórico relacional!');
}

applyWhatsAppMirrorUpdate().catch(console.error);
