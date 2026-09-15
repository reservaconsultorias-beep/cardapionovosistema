const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tipnhvpivhaerumetona.supabase.co',
  'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat'
);

async function check() {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value, updated_at')
    .like('key', 'chat_conversation_%');

  console.log('Total conversas no banco:', data?.length);
  if (data) {
    data.forEach(d => {
      console.log(`- ${d.key}: Cliente: ${d.value?.name}, Tel: ${d.value?.phone}, Pausado: ${d.value?.paused}, Última msg: "${d.value?.last_message}" (${d.value?.last_sender})`);
    });
  }
}

check().catch(console.error);
