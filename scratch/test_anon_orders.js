import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tipnhvpivhaerumetona.supabase.co';
const ANON_KEY = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function check() {
  // Test anon select
  const { data: anonOrders, error: anonErr } = await supabase.from('orders').select('id, customer_name, status, created_at').order('created_at', { ascending: false }).limit(10);
  console.log('Anon orders count:', anonOrders?.length, 'error:', anonErr);
  if (anonOrders && anonOrders.length > 0) {
    console.log('Top order:', anonOrders[0]);
  }
}

check();
