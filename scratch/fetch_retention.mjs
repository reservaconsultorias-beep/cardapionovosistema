import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: orders } = await supabase.from('orders').select('*');
  
  const clientOrders = {}; // phone -> count
  const zones = {};
  let freeShippingCount = 0;

  orders.forEach(o => {
      if (o.status === 'cancelled') return;

      // Track clients
      const phone = o.customer_phone;
      if (phone) {
          clientOrders[phone] = (clientOrders[phone] || 0) + 1;
      }

      // Track zones
      const zone = o.delivery_zone;
      if (zone) {
          zones[zone] = (zones[zone] || 0) + 1;
      }

      // Track free shipping (> 35 total_amount and is delivery, usually means free shipping)
      const type = o.order_type?.toLowerCase();
      if (type === 'delivery' || type === 'entrega') {
          // If total >= 35, it triggers free shipping rule in their system
          if (o.total_amount >= 35) {
              freeShippingCount++;
          }
      }
  });

  let newClients = 0;
  let retainedClients = 0; // > 1
  let superRetained = 0; // >= 3

  Object.values(clientOrders).forEach(count => {
      if (count === 1) newClients++;
      if (count > 1) retainedClients++;
      if (count >= 3) superRetained++;
  });

  const sortedZones = Object.entries(zones).sort((a, b) => b[1] - a[1]);

  console.log("Total unique clients:", Object.keys(clientOrders).length);
  console.log("New clients (1 order):", newClients);
  console.log("Retained (2+ orders):", retainedClients);
  console.log("Super Retained (3+ orders):", superRetained);
  console.log("Orders with Free Shipping (>= €35):", freeShippingCount);
  console.log("Top Zones:", sortedZones.slice(0, 5));
}

main();
