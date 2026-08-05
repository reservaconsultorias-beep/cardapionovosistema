const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const url = envLocal.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = envLocal.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);

async function run() {
  console.log('--- PURGANDO TODOS OS DADOS VIA BUSCA DE IDS ---');

  // Login
  await supabase.auth.signInWithPassword({
    email: '41menus@41menus.com',
    password: 'senha'
  });

  // 1. Orders
  const { data: orders } = await supabase.from('orders').select('id');
  if (orders && orders.length > 0) {
    const ids = orders.map(o => o.id);
    const { error } = await supabase.from('orders').delete().in('id', ids);
    console.log(`Excluídos ${orders.length} pedidos. Erro:`, error);
  } else {
    console.log('Nenhum pedido encontrado no DB.');
  }

  // 2. Cash Sessions
  const { data: sessions } = await supabase.from('cash_sessions').select('id');
  if (sessions && sessions.length > 0) {
    const ids = sessions.map(s => s.id);
    const { error } = await supabase.from('cash_sessions').delete().in('id', ids);
    console.log(`Excluídas ${sessions.length} sessões de caixa. Erro:`, error);
  } else {
    console.log('Nenhuma sessão de caixa encontrada no DB.');
  }

  // 3. Customers
  const { data: customers } = await supabase.from('customers').select('id');
  if (customers && customers.length > 0) {
    const ids = customers.map(c => c.id);
    const { error } = await supabase.from('customers').delete().in('id', ids);
    console.log(`Excluídos ${customers.length} clientes. Erro:`, error);
  } else {
    console.log('Nenhum cliente encontrado no DB.');
  }
}

run();
