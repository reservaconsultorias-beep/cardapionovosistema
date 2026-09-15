const apiKey = process.env.N8N_API_KEY;

async function listWfs() {
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await getRes.json();
  const wfs = data.data || [];
  console.log('Total workflows:', wfs.length);
  wfs.forEach(w => {
    console.log(`- ID: ${w.id} | Name: "${w.name}" | Active: ${w.active}`);
  });
}

listWfs().catch(console.error);
