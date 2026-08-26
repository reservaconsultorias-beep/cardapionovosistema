import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://tipnhvpivhaerumetona.supabase.co';
const SERVICE_KEY = process.env.BACKUP_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('Defina a variável BACKUP_SERVICE_KEY antes de rodar.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const TABLES = [
  'categories', 'menu_items', 'paused_items', 'extra_groups', 'extras',
  'category_extra_groups', 'settings', 'delivery_zones', 'business_hours',
  'profiles', 'customers', 'orders', 'cash_sessions'
];

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = `backups/${stamp}`;
fs.mkdirSync(dir, { recursive: true });

for (const table of TABLES) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error(`Erro em ${table}:`, error.message);
    continue;
  }
  fs.writeFileSync(`${dir}/${table}.json`, JSON.stringify(data, null, 2));
  console.log(`${table}: ${data.length} linhas salvas.`);
}

console.log(`\nBackup completo em: ${dir}`);
