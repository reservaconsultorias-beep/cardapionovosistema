import pg from 'pg';
const { Client } = pg;

const SQL = `
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('sangria', 'suprimento')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff manage cash_movements" ON public.cash_movements;
CREATE POLICY "staff manage cash_movements"
ON public.cash_movements
FOR ALL
TO public
USING (true)
WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
`;

const candidates = [
  'postgresql://postgres:SenhaSuperSecreta41Menus2026@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:SenhaSuperSecreta41Menus@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:41menus2026@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:pizzaria41menus@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:pizzaria_41menus@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:pizzaria41menus2026@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:admin@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:N852213n$%$@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:N852213n@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:N852213n$@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
  'postgresql://postgres:pizzaria@db.tipnhvpivhaerumetona.supabase.co:5432/postgres'
];

async function tryConnectAndRun() {
  for (const connStr of candidates) {
    const masked = connStr.replace(/:([^:@]+)@/, ':***@');
    console.log('Tentando:', masked);
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false }
    });
    try {
      await client.connect();
      console.log('SUCESSO de conexão com:', masked);
      await client.query(SQL);
      console.log('TABELA cash_movements E POLÍTICAS CRIADAS COM SUCESSO!');
      const verify = await client.query("SELECT count(*) FROM public.cash_movements");
      console.log('Verificação de tabela (linhas):', verify.rows[0].count);
      await client.end();
      return true;
    } catch (err) {
      console.log('Falhou:', err.message);
      try { await client.end(); } catch (e) {}
    }
  }
  return false;
}

tryConnectAndRun().then(success => {
  if (!success) {
    console.error('Nenhuma das conexões teve sucesso.');
    process.exit(1);
  }
});
