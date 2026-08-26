const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.storage.from('Cardapio').list(null, { limit: 1000, offset: 0 });
  console.log('Root null:', data?.map(f => f.name), error);
  const { data: d2 } = await supabase.storage.from('Cardapio').list('', { limit: 1000, offset: 0 });
  console.log('Root empty:', d2?.map(f => f.name));
}
run();
