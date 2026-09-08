const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tipnhvpivhaerumetona.supabase.co', 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat');

async function test() {
  const { data: sessions, error } = await supabase.from('cash_sessions').select('*').order('opened_at', { ascending: false }).limit(5);
  if (error) { console.error(error); return; }
  
  console.log('Sessões de caixa recentes:');
  for (const s of sessions || []) {
    console.log('Sessão ID:', s.id, '| Status:', s.status, '| Aberto:', s.opened_at, '| Fechado:', s.closed_at);
    
    // Check orders by cash_session_id
    const { data: bySessionId } = await supabase.from('orders').select('id, created_at, total_amount').eq('cash_session_id', s.id);
    // Check orders by timestamp range
    const { data: byTime } = await supabase.from('orders').select('id, created_at, total_amount')
      .gte('created_at', s.opened_at)
      .lte('created_at', s.closed_at || new Date().toISOString());
      
    console.log('  -> Pedidos por cash_session_id:', bySessionId ? bySessionId.length : 0);
    console.log('  -> Pedidos por timestamp:', byTime ? byTime.length : 0);
  }
}

test();
