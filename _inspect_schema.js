import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.development' });

async function getOpenAPI() {
  const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  fs.writeFileSync('openapi.json', JSON.stringify(data, null, 2));
}

getOpenAPI();
