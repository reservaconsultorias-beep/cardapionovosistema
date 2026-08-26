const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tipnhvpivhaerumetona.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcG5odnBpdmhhZXJ1bWV0b25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIwOTE1NywiZXhwIjoyMDk5Nzg1MTU3fQ.7YVV4S0k6Hr_i0LLtPGUYkfvGHPxEff25cZc7OYIItc');

async function run() {
  const { data, error } = await supabase.storage.from('Cardapio').list('', { limit: 1000 });
  const folders = data.filter(d => !d.id);
  const files = data.filter(d => d.id);
  console.log('Root files:', files.map(f => f.name));
  
  for (const f of folders) {
    const { data: d2 } = await supabase.storage.from('Cardapio').list(f.name, { limit: 1000 });
    console.log(f.name + ' files:', d2?.map(x => x.name));
  }
}
run();
