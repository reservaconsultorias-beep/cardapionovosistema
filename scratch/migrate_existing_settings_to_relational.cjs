const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://tipnhvpivhaerumetona.supabase.co',
  'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat'
);

async function migrateData() {
  console.log('1. Lendo conversas existentes da tabela settings...');
  const { data: settingsData, error } = await supabase
    .from('settings')
    .select('key, value, updated_at')
    .like('key', 'chat_conversation_%');

  if (error) {
    console.error('Erro ao ler settings:', error);
    return;
  }

  console.log(`Encontradas ${settingsData.length} conversas para migrar.`);

  for (const item of settingsData) {
    const val = item.value;
    if (!val || !val.phone) continue;

    const phone = String(val.phone).replace(/\D/g, '');
    const name = val.name || 'Cliente';
    const paused = Boolean(val.paused);
    const paused_at = val.paused_at || null;
    const last_message = val.last_message || '';
    const last_sender = val.last_sender || 'client';
    const updated_at = val.updated_at || item.updated_at || new Date().toISOString();

    console.log(`- Migrando conversa ${phone} (${name})...`);

    // 1. Upsert em chat_conversations
    const { data: convRes, error: convErr } = await supabase
      .from('chat_conversations')
      .upsert({
        phone,
        name,
        paused,
        paused_at,
        last_message,
        last_sender,
        updated_at
      }, { onConflict: 'phone' })
      .select('id')
      .single();

    if (convErr) {
      console.warn(`Aviso ao salvar conversa ${phone}:`, convErr.message);
      continue;
    }

    const convId = convRes?.id;

    // 2. Inserir mensagens em chat_messages
    const messages = Array.isArray(val.messages) ? val.messages : [];
    console.log(`  Inserindo ${messages.length} mensagens...`);

    for (const msg of messages) {
      if (!msg.text) continue;

      const sender = (msg.sender === 'bot' || msg.sender === 'ai') ? 'bot' : (msg.sender === 'human' ? 'human' : 'client');
      const createdAt = msg.timestamp || msg.created_at || updated_at;

      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: convId,
          phone,
          sender,
          text: msg.text,
          created_at: createdAt
        });
    }
  }

  console.log('✓ Migração de dados concluída com sucesso!');
}

migrateData().catch(console.error);
