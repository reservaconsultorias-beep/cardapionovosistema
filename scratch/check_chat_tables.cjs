const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tipnhvpivhaerumetona.supabase.co',
  'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat'
);

async function checkTables() {
  const convRes = await supabase.from('chat_conversations').select('id').limit(1);
  console.log('chat_conversations test:', convRes.error ? convRes.error.message : 'EXISTS!');

  const msgRes = await supabase.from('chat_messages').select('id').limit(1);
  console.log('chat_messages test:', msgRes.error ? msgRes.error.message : 'EXISTS!');
}

checkTables().catch(console.error);
