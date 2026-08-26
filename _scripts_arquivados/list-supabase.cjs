const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.storage.from('Cardapio').list('', { limit: 100 });
  console.log('Root:', data?.map(f => f.name));
  const { data: d2 } = await supabase.storage.from('Cardapio').list('41menus', { limit: 100 });
  console.log('41menus:', d2?.map(f => f.name));
  const { data: d3 } = await supabase.storage.from('Cardapio').list('41menus/produtos', { limit: 100 });
  console.log('41menus/produtos:', d3?.map(f => f.name));
}
run();
