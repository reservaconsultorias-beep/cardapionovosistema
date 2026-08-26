const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('menu_items').select('*');
  console.log(data?.map(i => ({ id: i.id, name: i.name, image_url: i.image_url })), error);
}
run();
