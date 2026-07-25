const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.storage.from('Cardapio').list('41menus/produtos', { limit: 1000 });
  console.log('41menus/produtos:', data?.map(f => f.name), error);
}
run();
