const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseAnonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRecentOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, customer_name, customer_phone, total_amount, status, cash_session_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  console.log('--- ÚLTIMOS 10 PEDIDOS NA TABELA ORDERS ---');
  orders.forEach(o => {
    console.log(`ID: ${o.id} | Data: ${o.created_at} | Cliente: ${o.customer_name} | Valor: ${o.total_amount} | Status: ${o.status} | cash_session_id: ${o.cash_session_id}`);
  });

  const { data: activeSession } = await supabase
    .from('cash_sessions')
    .select('*')
    .eq('status', 'aberto')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('\n--- CAIXA ABERTO ATUAL ---');
  console.log(activeSession ? `ID: ${activeSession.id} | Aberto em: ${activeSession.opened_at}` : 'NENHUM CAIXA ABERTO NO MOMENTO');

  const { data: recentSessions } = await supabase
    .from('cash_sessions')
    .select('*')
    .order('opened_at', { ascending: false })
    .limit(3);

  console.log('\n--- ÚLTIMAS 3 SESSÕES DE CAIXA ---');
  recentSessions?.forEach(s => {
    console.log(`ID: ${s.id} | Status: ${s.status} | Aberto: ${s.opened_at} | Fechado: ${s.closed_at}`);
  });
}

checkRecentOrders();
