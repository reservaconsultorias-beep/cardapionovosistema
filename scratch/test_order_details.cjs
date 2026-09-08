const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tipnhvpivhaerumetona.supabase.co', 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat');

async function test() {
  const sessionId = '8facb593-2b7e-48eb-b5fb-b71c05d7daa0';
  const { data: orders } = await supabase.from('orders').select('*').eq('cash_session_id', sessionId).order('created_at', { ascending: true });
  console.log('Total orders:', orders.length);
  if (orders.length > 0) {
    const o = orders[0];
    console.log('Sample order keys:', Object.keys(o));
    console.log('Order #', o.id);
    console.log('Customer:', o.customer_name, o.customer_phone, o.delivery_address);
    console.log('Type:', o.order_type, '| Payment:', o.payment_method, '| Amount:', o.total_amount);
    console.log('Items sample:', typeof o.items === 'string' ? o.items.slice(0, 300) : JSON.stringify(o.items).slice(0, 300));
  }
}

test();
