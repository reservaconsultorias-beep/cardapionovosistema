const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('menu_items').select('*').limit(1);
  console.log('menu_items table:', data, error);
}
if(process.env.VITE_SUPABASE_URL) run();
