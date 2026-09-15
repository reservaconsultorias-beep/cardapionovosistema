const apiKey = process.env.N8N_API_KEY;

async function checkWhyIfStopped() {
  const detailRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/executions/3433?includeData=true`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const detail = await detailRes.json();
  const runData = detail.data?.resultData?.runData || detail.resultData?.runData || {};
  console.log('If node saída:', JSON.stringify(runData['If'], null, 2));
}

checkWhyIfStopped().catch(console.error);
