const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tipnhvpivhaerumetona.supabase.co';
const supabaseKey = 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingColumns() {
  console.log('Verificando colunas da tabela orders...');
  
  // First, let's check the current structure by fetching one row
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  
  if (error) {
    console.error('Erro ao consultar orders:', error.message);
  } else {
    console.log('Colunas atuais da tabela orders:');
    if (data && data.length > 0) {
      console.log(Object.keys(data[0]).join(', '));
    } else {
      console.log('Tabela vazia, não é possível listar colunas assim.');
    }
  }

  // Try to add the columns using RPC or direct SQL
  // Since we're using the anon key, we need to use rpc or the REST API
  // Let's try adding data with the new columns to see if they exist
  
  console.log('\nTentando verificar se as colunas existem...');
  
  // Test by trying to select the specific columns
  const { error: testError } = await supabase
    .from('orders')
    .select('discount_amount, additional_amount, edit_reason')
    .limit(1);
  
  if (testError) {
    console.log('❌ Colunas NÃO existem:', testError.message);
    console.log('\n⚠️  Você precisa adicionar as colunas manualmente no Supabase SQL Editor.');
    console.log('Acesse: https://supabase.com/dashboard → Seu projeto → SQL Editor');
    console.log('\nExecute o seguinte SQL:\n');
    console.log(`
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS additional_amount NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS edit_reason TEXT DEFAULT '';
    `);
  } else {
    console.log('✅ Todas as colunas já existem!');
  }
}

addMissingColumns().catch(console.error);
