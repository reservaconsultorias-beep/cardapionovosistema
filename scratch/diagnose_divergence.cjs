const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseAnonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get all orders in last 30 days
  const { data: orders } = await supabase.from('orders').select('id, created_at, total_amount, status, cash_session_id, payment_method').gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: false });

  // Get all cash sessions in last 30 days
  const { data: sessions } = await supabase.from('cash_sessions').select('*').order('closed_at', { ascending: false });

  const activeOrders = (orders || []).filter(o => o.status !== 'Cancelado' && o.status !== 'cancelado');
  const totalFromOrders = activeOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

  console.log(`\n=== DIAGNÓSTICO DE DIVERGÊNCIA ===`);
  console.log(`Pedidos ativos nos últimos 30 dias: ${activeOrders.length}`);
  console.log(`Faturamento bruto (soma de todos os pedidos): € ${totalFromOrders.toFixed(2)}`);

  // Check which orders have cash_session_id
  const withSessionId = activeOrders.filter(o => o.cash_session_id);
  const withoutSessionId = activeOrders.filter(o => !o.cash_session_id);
  console.log(`\nPedidos COM cash_session_id: ${withSessionId.length} (€ ${withSessionId.reduce((s, o) => s + Number(o.total_amount || 0), 0).toFixed(2)})`);
  console.log(`Pedidos SEM cash_session_id: ${withoutSessionId.length} (€ ${withoutSessionId.reduce((s, o) => s + Number(o.total_amount || 0), 0).toFixed(2)})`);

  // For each session, check date range match
  const recentSessions = (sessions || []).filter(s => s.closed_at && new Date(s.closed_at) >= thirtyDaysAgo);
  console.log(`\nSessões de caixa nos últimos 30 dias: ${recentSessions.length}`);

  let totalMatchedByDate = 0;
  let matchedOrderIds = new Set();

  recentSessions.forEach(session => {
    const openedAt = new Date(session.opened_at).getTime();
    const closedAt = new Date(session.closed_at).getTime();
    let sessionTotal = 0;
    let sessionOrderCount = 0;

    activeOrders.forEach(o => {
      const matchById = o.cash_session_id && o.cash_session_id === session.id;
      const orderTime = new Date(o.created_at).getTime();
      const matchByDate = !matchById && orderTime >= openedAt && orderTime <= closedAt;
      if (matchById || matchByDate) {
        sessionTotal += Number(o.total_amount || 0);
        sessionOrderCount++;
        matchedOrderIds.add(o.id);
      }
    });

    console.log(`  Sessão ${session.id.substring(0,8)}... | ${session.opened_at} → ${session.closed_at} | Pedidos: ${sessionOrderCount} | Total: € ${sessionTotal.toFixed(2)}`);
    totalMatchedByDate += sessionTotal;
  });

  console.log(`\nTotal vinculado a sessões (por data): € ${totalMatchedByDate.toFixed(2)}`);
  
  // Find unmatched orders
  const unmatchedOrders = activeOrders.filter(o => !matchedOrderIds.has(o.id));
  const unmatchedTotal = unmatchedOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  console.log(`Pedidos NÃO vinculados a nenhuma sessão: ${unmatchedOrders.length} (€ ${unmatchedTotal.toFixed(2)})`);
  
  if (unmatchedOrders.length > 0) {
    console.log(`\nPedidos órfãos (sem sessão correspondente):`);
    unmatchedOrders.forEach(o => {
      console.log(`  #${o.id.substring(0,8)} | ${o.created_at} | € ${Number(o.total_amount || 0).toFixed(2)} | session_id: ${o.cash_session_id || 'NULL'} | ${o.payment_method}`);
    });
  }

  console.log(`\n=== RESUMO ===`);
  console.log(`Faturamento bruto (card): € ${totalFromOrders.toFixed(2)}`);
  console.log(`Soma das sessões (modal): € ${totalMatchedByDate.toFixed(2)}`);
  console.log(`Diferença: € ${(totalFromOrders - totalMatchedByDate).toFixed(2)} = pedidos fora de qualquer sessão de caixa`);
}

diagnose();
