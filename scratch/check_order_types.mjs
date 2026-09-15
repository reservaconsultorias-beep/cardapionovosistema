import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: orders } = await supabase.from('orders').select('order_type');
  
  let delivery = 0;
  let pickup = 0;
  let pdv = 0;
  let other = 0;

  orders.forEach(o => {
      const type = o.order_type?.toLowerCase() || '';
      if (type === 'delivery') delivery++;
      else if (type === 'pickup' || type === 'takeaway') pickup++;
      else if (type === 'pdv' || type === 'balcao' || type === 'local') pdv++;
      else other++;
      
      console.log("Found type:", type); // just to see what the values are
  });

  console.log(`Deliveries: ${delivery}, Pickups: ${pickup}, PDV: ${pdv}, Other: ${other}`);
}

main();
