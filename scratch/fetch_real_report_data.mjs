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
  let deliveryCount = 0;
  let pickupCount = 0;
  let totalItemsSold = 0;
  const uniqueUsers = new Set();
  const paymentMethods = {};
  const itemSales = {};

  const revenueByWeek = {};

  orders.forEach(order => {
    if (order.status !== 'cancelled') {
      totalRevenue += order.total_amount;
      uniqueUsers.add(order.user_id || order.customer_phone);
      
      if (order.fulfillment_type === 'delivery') deliveryCount++;
      if (order.fulfillment_type === 'pickup') pickupCount++;
      
      const pMethod = order.payment_method || 'Desconhecido';
      paymentMethods[pMethod] = (paymentMethods[pMethod] || 0) + 1;

      // Weekly revenue
      const date = new Date(order.created_at);
      const weekStr = `${date.getFullYear()}-${date.getMonth()+1}-${Math.ceil(date.getDate()/7)}`;
      if (!revenueByWeek[weekStr]) {
        revenueByWeek[weekStr] = { label: `Semana ${Math.ceil(date.getDate()/7)}/${date.getMonth()+1}`, total: 0 };
      }
      revenueByWeek[weekStr].total += order.total_amount;

      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          totalItemsSold += item.quantity;
          const itemName = item.menuItem?.name;
          if (itemName) {
            if (!itemSales[itemName]) {
              itemSales[itemName] = { qty: 0, cat: item.menuItem.category, id: item.menuItem.id };
            }
            itemSales[itemName].qty += item.quantity;
          }
        });
      }
    }
  });

  const sortedItems = Object.entries(itemSales).sort((a, b) => b[1].qty - a[1].qty);
  const top5 = sortedItems.slice(0, 5);

  console.log("Fetching real images for top 5...");
  const top5Names = top5.map(i => i[0]);
  
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items') // fetching all to ensure we have images
    .select('name, image_url')
    .in('name', top5Names);

  let fetchedImages = [];
  if (menuError) {
    console.error("Error fetching menu items:", menuError);
  } else {
    fetchedImages = menuItems || [];
  }

  const finalTop5 = top5.map((item, index) => {
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
    deliveryCount,
    pickupCount,
    totalItemsSold,
    uniqueClients: uniqueUsers.size,
    paymentMethods: Object.entries(paymentMethods).map(([name, value]) => ({ name, value })),
    revenueByWeek: Object.values(revenueByWeek),
    top5: finalTop5
  };

  fs.writeFileSync('scratch/real_report_data.json', JSON.stringify(reportData, null, 2));
  console.log("Data written to scratch/real_report_data.json");
}

main();
