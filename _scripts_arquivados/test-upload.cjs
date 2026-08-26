const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.storage.from('Cardapio').upload('test.txt', 'hello world');
  console.log('upload result:', data, error);
}
if(process.env.VITE_SUPABASE_URL) run();
