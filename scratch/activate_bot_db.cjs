const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tipnhvpivhaerumetona.supabase.co',
  'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat'
);

async function activateBot() {
  const { data, error } = await supabase
    .from('settings')
    .upsert({
      key: 'bot_active',
      value: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  console.log('Bot reativado no Supabase:', data, error);
}

activateBot().catch(console.error);
