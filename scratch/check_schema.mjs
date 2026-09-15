import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking menu_items...");
  const { data: menuItems } = await supabase.from('menu_items').select('*').limit(1);
  if (menuItems && menuItems.length > 0) {
    console.log("Menu Items columns:", Object.keys(menuItems[0]));
  }
  
  console.log("Checking orders...");
  const { data: orders } = await supabase.from('orders').select('*').limit(1);
  if (orders && orders.length > 0) {
    console.log("Orders columns:", Object.keys(orders[0]));
    if (orders[0].items && orders[0].items.length > 0) {
        console.log("Order items JSON structure:", Object.keys(orders[0].items[0]));
    }
  }
}

main();
