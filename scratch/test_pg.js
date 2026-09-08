import pg from 'pg';
const { Client } = pg;

async function tryConnect(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    console.log('Connected successfully to:', connectionString.split('@')[1]);
    const res = await client.query('SELECT current_user, current_database();');
    console.log('Query result:', res.rows);
    await client.end();
    return true;
  } catch (err) {
    console.log('Failed:', err.message);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function main() {
  const hosts = [
    'postgresql://postgres.tipnhvpivhaerumetona:pizzaria_41menus@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres.tipnhvpivhaerumetona:pizzaria_41menus@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    'postgresql://postgres:pizzaria_41menus@db.tipnhvpivhaerumetona.supabase.co:5432/postgres',
    'postgresql://postgres:pizzaria_41menus@db.tipnhvpivhaerumetona.supabase.co:6543/postgres'
  ];
  for (const h of hosts) {
    console.log('Testing host...');
    const ok = await tryConnect(h);
    if (ok) break;
  }
}

main();
