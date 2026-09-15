import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: orders, error } = await supabase.from('orders').select('*');
  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  // Analytics
  let totalRevenue = 0;
  let totalOrders = orders.length;
  let statusCounts = {};
  let paymentMethodCounts = {};
  let itemsSold = {};
  let categoriesSold = {};
  let ordersPerMonth = {};

  orders.forEach(order => {
    // Basic stats
    if (order.status !== 'Cancelado') {
      totalRevenue += (order.total_amount || 0);
    }
    
    // Status
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    
    // Payment Method
    let payment = order.payment_method || 'Desconhecido';
    paymentMethodCounts[payment] = (paymentMethodCounts[payment] || 0) + 1;

    // Timeline
    let date = new Date(order.created_at);
    let monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    ordersPerMonth[monthYear] = (ordersPerMonth[monthYear] || 0) + 1;

    // Items
    if (order.status !== 'Cancelado' && order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        let qty = item.quantity || 1;
        let name = item.name || 'Desconhecido';
        let category = item.category || 'sem_categoria';
        
        itemsSold[name] = (itemsSold[name] || 0) + qty;
        categoriesSold[category] = (categoriesSold[category] || 0) + qty;
      });
    }
  });

  const topItems = Object.entries(itemsSold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
    
  const topCategories = Object.entries(categoriesSold)
    .sort((a, b) => b[1] - a[1]);

  const report = {
    totalOrders,
    totalRevenue,
    averageTicket: totalRevenue / (totalOrders - (statusCounts['Cancelado'] || 0) || 1),
    statusCounts,
    paymentMethodCounts,
    ordersPerMonth,
    topItems,
    topCategories
  };

  fs.writeFileSync('c:/Users/herek/.gemini/antigravity-ide/brain/7f8f549e-f02c-4457-9c16-e14815cc0551/scratch/report_data.json', JSON.stringify(report, null, 2));
  console.log('Report data saved to scratch/report_data.json');
}

main();
