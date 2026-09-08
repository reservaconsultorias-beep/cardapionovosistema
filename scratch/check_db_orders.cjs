const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseAnonKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('--- CHECANDO PEDIDOS ---');
  // Total orders count
  const { count, error: countErr } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });
  
  console.log('Total de pedidos:', count, countErr ? `(Erro: ${countErr.message})` : '');

  // Earliest orders
  const { data: firstOrders, error: firstErr } = await supabase
    .from('orders')
    .select('id, created_at, customer_name, total_amount, status')
    .order('created_at', { ascending: true })
    .limit(5);

  if (firstErr) {
    console.error('Erro ao buscar primeiros pedidos:', firstErr);
  } else {
    console.log('Primeiros 5 pedidos registrados no banco:');
    firstOrders.forEach(o => console.log(` - Pedido #${o.id} em ${o.created_at} | Cliente: ${o.customer_name} | Valor: €${o.total_amount} | Status: ${o.status}`));
  }

  // Latest orders
  const { data: lastOrders, error: lastErr } = await supabase
    .from('orders')
    .select('id, created_at, customer_name, total_amount, status')
    .order('created_at', { ascending: false })
    .limit(3);

  if (!lastErr && lastOrders) {
    console.log('\nÚltimos pedidos registrados no banco:');
    lastOrders.forEach(o => console.log(` - Pedido #${o.id} em ${o.created_at} | Cliente: ${o.customer_name} | Valor: €${o.total_amount} | Status: ${o.status}`));
  }

  console.log('\n--- CHECANDO CONFIGURAÇÕES (TABELA settings) ---');
  const { data: settings, error: setErr } = await supabase
    .from('settings')
    .select('*');

  if (setErr) {
    console.error('Erro ao buscar settings:', setErr);
  } else {
    console.log('Configurações atuais no banco:', settings);
  }

  console.log('\n--- CHECANDO TABELA business_hours / restaurant_settings / etc ---');
  const { data: bh, error: bhErr } = await supabase
    .from('business_hours')
    .select('*');
  if (!bhErr && bh) {
    console.log('Tabela business_hours:', bh);
  } else {
    console.log('Sem tabela business_hours ou erro:', bhErr?.message);
  }
}

check();
