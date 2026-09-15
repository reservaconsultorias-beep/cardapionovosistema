const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function configureDirectSupabaseMirror() {
  console.log('1. Buscando workflow no n8n...');
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wf = data.data || data;

  const nodeCliente = wf.nodes.find(n => n.name === 'Espelho: Registra Cliente');
  const nodeBot = wf.nodes.find(n => n.name === 'Espelho: Registra Bot');

  // Transforma Espelho: Registra Cliente em Code JavaScript que lê e grava direto no Supabase
  // Ou melhor: usa HTTP Request direto no Supabase REST API!
  // Supabase REST endpoint: https://tipnhvpivhaerumetona.supabase.co/rest/v1/rpc/... ou settings upsert!
  // Podemos fazer um Code node que usa fetch nativo no n8n para gravar direto no Supabase REST API!
  console.log('2. Atualizando Espelho: Registra Cliente para Code Node com fetch direto no Supabase...');
  
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

    // 1. Busca conversa existente
    const getRes = await fetch(supabaseUrl + '/rest/v1/settings?key=eq.' + convKey + '&select=value', {
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey
      }
    });
    const currentList = await getRes.json();
    const existing = currentList?.[0]?.value || {};
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

    // 2. Grava no Supabase
    await fetch(supabaseUrl + '/rest/v1/settings', {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: convKey,
        value: updatedValue,
        updated_at: new Date().toISOString()
      })
    });
  } catch (err) {
    // silencioso para nunca travar o fluxo da IA
  }
}

return $input.all();
`
    };
  }

  if (nodeBot) {
    nodeBot.type = 'n8n-nodes-base.code';
    nodeBot.typeVersion = 2;
    nodeBot.parameters = {
      language: 'javaScript',
      jsCode: `
const phone = String($('Coleta').item.json.telefone || '').replace(/\\D/g, '');
const name = $('Coleta').item.json.nome || 'Cliente';
const text = $json.item || $('AGENTE DE I.A.').item.json.output || '';

if (phone && text) {
  try {
    const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
    const anonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
    const convKey = 'chat_conversation_' + phone;

    // 1. Busca conversa existente
    const getRes = await fetch(supabaseUrl + '/rest/v1/settings?key=eq.' + convKey + '&select=value', {
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey
      }
    });
    const currentList = await getRes.json();
    const existing = currentList?.[0]?.value || {};
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

    // 2. Grava no Supabase
    await fetch(supabaseUrl + '/rest/v1/settings', {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: convKey,
        value: updatedValue,
        updated_at: new Date().toISOString()
      })
    });
  } catch (err) {
    // silencioso para nunca travar o envio de mensagens
  }
}

return $input.all();
`
    };
  }

  console.log('3. Salvando workflow com espelho direto no Supabase...');
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
    throw new Error('Erro ao salvar workflow: ' + putRes.status + ' ' + (await putRes.text()));
  }

  console.log('4. Reativando workflow no n8n...');
  await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });

  console.log('🎉 ESPELHO DIRETO NO SUPABASE ATIVADO COM SUCESSO!');
}

configureDirectSupabaseMirror().catch(console.error);
