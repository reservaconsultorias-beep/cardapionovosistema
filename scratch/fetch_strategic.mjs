import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: orders } = await supabase.from('orders').select('*');

  let maxOrder = 0;
  let maxOrderDate = null;
  const hours = {};
  const days = {};
  const dailyRevenue = {}; // YYYY-MM-DD -> total

  orders.forEach(o => {
      if (o.status === 'cancelled') return;

      const dateStr = o.created_at;
      if (!dateStr) return;

      const d = new Date(dateStr);

      // Most expensive order
      if (o.total_amount > maxOrder) {
          maxOrder = o.total_amount;
          maxOrderDate = dateStr;
      }

      // Peak hour
      const hour = d.getHours();
      hours[hour] = (hours[hour] || 0) + 1;

      // Best day of the week (0 = Sunday, 1 = Monday...)
      const day = d.getDay();
      days[day] = (days[day] || 0) + 1;

      // Daily revenue
      const dayStr = dateStr.split('T')[0];
      dailyRevenue[dayStr] = (dailyRevenue[dayStr] || 0) + o.total_amount;
  });

  const topHour = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
  
  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const topDay = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
  
  const topRevenueDay = Object.entries(dailyRevenue).sort((a, b) => b[1] - a[1])[0];

  console.log("Most expensive order:", maxOrder, "on", maxOrderDate);
  console.log("Peak hour:", topHour[0], "h with", topHour[1], "orders");
  console.log("Best day of the week:", dayNames[topDay[0]], "with", topDay[1], "orders");
  console.log("Highest daily revenue:", topRevenueDay[0], "with €", topRevenueDay[1].toFixed(2));
}

main();
