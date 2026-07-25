const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.storage.from('Cardapio').list();
  console.log('Root:', data, error);
  const { data: d2, error: e2 } = await supabase.storage.from('Cardapio').list('41menus/produtos');
  console.log('41menus/produtos:', d2, e2);
}
run();
