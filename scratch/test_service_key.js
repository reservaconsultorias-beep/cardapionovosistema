import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tipnhvpivhaerumetona.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcG5odnBpdmhhZXJ1bWV0b25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIwOTE1NywiZXhwIjoyMDk5Nzg1MTU3fQ.7YVV4S0k6Hr_i0LLtPGUYkfvGHPxEff25cZc7OYIItc';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  // Test listing orders with admin client
  const { data, error } = await supabaseAdmin.from('orders').select('id, customer_name, status, total_amount, created_at').order('created_at', { ascending: false }).limit(5);
  console.log('Orders with service_role:', data, error);
}

main();
