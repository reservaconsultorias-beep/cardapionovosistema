const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tipnhvpivhaerumetona.supabase.co',
  'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat'
);

async function checkOrder() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer_name, customer_phone, total_amount, status, created_at, items')
    .eq('id', 307)
    .single();

  console.log('Pedido verificado no banco:', data, error);
}

checkOrder().catch(console.error);
