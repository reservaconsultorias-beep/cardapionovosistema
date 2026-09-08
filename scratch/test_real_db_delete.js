import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tipnhvpivhaerumetona.supabase.co';
const ANON_KEY = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcG5odnBpdmhhZXJ1bWV0b25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIwOTE1NywiZXhwIjoyMDk5Nzg1MTU3fQ.7YVV4S0k6Hr_i0LLtPGUYkfvGHPxEff25cZc7OYIItc';

const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

async function test() {
  // 1. Create a dummy test order with service client
  const { data: created, error: createErr } = await adminClient.from('orders').insert({
    customer_name: 'TESTE EXCLUSAO AGENT',
    customer_phone: '999999999',
    order_type: 'balcao',
    payment_method: 'Dinheiro',
    status: 'Pendente',
    total_amount: 1.00,
    items: [{ name: 'Item Teste', quantity: 1, price: 1.00 }]
  }).select().single();

  if (createErr) {
    console.error('Error creating test order:', createErr);
    return;
  }

  console.log('Created test order ID:', created.id);

  // 2. Try to delete with anonClient (without login)
  const { data: delAnon, error: delAnonErr } = await anonClient.from('orders').delete().eq('id', created.id).select();
  console.log('Anon delete result (data, error):', delAnon, delAnonErr);

  // Check if it still exists
  const { data: check1 } = await adminClient.from('orders').select('id').eq('id', created.id);
  console.log('Still exists after anon delete?', check1?.length > 0);

  // 3. Try to login as the admin user and delete
  // Let's see if we can login or inspect users
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  console.log('Admin users:', users?.map(u => ({ id: u.id, email: u.email })));

  // Clean up
  await adminClient.from('orders').delete().eq('id', created.id);
  console.log('Cleaned up with admin client.');
}

test();
