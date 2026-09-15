const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tipnhvpivhaerumetona.supabase.co',
  'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat'
);

async function checkBotActiveSetting() {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value, updated_at')
    .eq('key', 'bot_active')
    .single();

  console.log('Status de bot_active no Supabase:', data, error);
}

checkBotActiveSetting().catch(console.error);
