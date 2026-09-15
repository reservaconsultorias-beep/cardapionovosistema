import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: orders } = await supabase.from('orders').select('*');
  const itemSales = {};

  orders.forEach(order => {
    if (order.status !== 'cancelled' && order.items) {
      order.items.forEach(item => {
        let cat = item.category || (item.menuItem ? item.menuItem.category : 'Outros');
        if (!cat) cat = 'Outros';

        const itemName = item.name || (item.menuItem ? item.menuItem.name : 'Unknown');
        if (itemName !== 'Unknown') {
          if (!itemSales[itemName]) itemSales[itemName] = { qty: 0, cat: cat };
          itemSales[itemName].qty += item.quantity;
        }
      });
    }
  });

  const sortedItems = Object.entries(itemSales).sort((a, b) => b[1].qty - a[1].qty);
  
  // Top 5 Pizzas
  const top5Pizzas = sortedItems
    .filter(i => i[1].cat.toLowerCase().includes('tradicionais') && !i[1].cat.toLowerCase().includes('esfiha'))
    .slice(0, 5);

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, image_url')
    .in('name', top5Pizzas.map(i => i[0]));

  const fetchedImages = menuItems || [];

  const finalTop5Pizzas = top5Pizzas.map((item, index) => {
    const dbItem = fetchedImages.find(mi => mi.name === item[0]);
    return {
      rank: index + 1,
      name: item[0],
      qty: item[1].qty,
      cat: item[1].cat,
      img: dbItem?.image_url || null
    };
  });

  console.log(JSON.stringify(finalTop5Pizzas, null, 2));
}

main();
