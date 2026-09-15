import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Fetching orders...");
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: true });

  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
    return;
  }

  let totalRevenue = 0;
  let totalItemsSold = 0;
  const uniqueUsers = new Set();
  const paymentMethods = {};
  
  const itemSales = {};
  const categorySales = {};

  orders.forEach(order => {
    if (order.status !== 'cancelled') {
      totalRevenue += order.total_amount;
      uniqueUsers.add(order.user_id || order.customer_phone);
      
      const pMethod = order.payment_method || 'Desconhecido';
      paymentMethods[pMethod] = (paymentMethods[pMethod] || 0) + 1;

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          totalItemsSold += item.quantity;
          
          // Using item.category or item.menuItem.category
          let cat = item.category;
          if (!cat && item.menuItem) {
              cat = item.menuItem.category;
          }
          if (!cat) cat = 'Outros';

          // Track category sales
          categorySales[cat] = (categorySales[cat] || 0) + item.quantity;

          const itemName = item.name || (item.menuItem ? item.menuItem.name : 'Unknown');
          if (itemName !== 'Unknown') {
            if (!itemSales[itemName]) {
              itemSales[itemName] = { qty: 0, cat: cat };
            }
            itemSales[itemName].qty += item.quantity;
          }
        });
      }
    }
  });

  const sortedItems = Object.entries(itemSales).sort((a, b) => b[1].qty - a[1].qty);
  
  // Categorias Mais Vendidas
  const topCategories = Object.entries(categorySales)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(c => ({ name: c[0], value: c[1] }));

  // Top 5 Geral
  const top5General = sortedItems.slice(0, 5);
  
  // Top 5 Esfihas
  const top5Esfihas = sortedItems
    .filter(i => i[1].cat.toLowerCase().includes('esfiha'))
    .slice(0, 5);
    
  // Top 5 Bebidas
  const top5Bebidas = sortedItems
    .filter(i => i[1].cat.toLowerCase().includes('bebida'))
    .slice(0, 5);

  // Fetch images for all needed items
  const allNeededNames = new Set([
      ...top5General.map(i => i[0]),
      ...top5Esfihas.map(i => i[0]),
      ...top5Bebidas.map(i => i[0])
  ]);

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('name, image_url')
    .in('name', Array.from(allNeededNames));

  const fetchedImages = menuItems || [];

  const formatList = (list) => list.map((item, index) => {
    const dbItem = fetchedImages.find(mi => mi.name === item[0]);
    return {
      rank: index + 1,
      name: item[0],
      qty: item[1].qty,
      cat: item[1].cat,
      img: dbItem?.image_url || null
    };
  });

  const reportData = {
    totalOrders: orders.length,
    totalRevenue: totalRevenue.toFixed(2),
    totalItemsSold,
    uniqueClients: uniqueUsers.size,
    topCategories,
    top5General: formatList(top5General),
    top5Esfihas: formatList(top5Esfihas),
    top5Bebidas: formatList(top5Bebidas)
  };

  fs.writeFileSync('scratch/robust_report_data.json', JSON.stringify(reportData, null, 2));
  console.log("Data written to scratch/robust_report_data.json");
}

main();
