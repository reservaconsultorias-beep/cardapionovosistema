const apiKey = process.env.N8N_API_KEY;

async function inspectExecution() {
  const detailRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/executions/3425?includeData=true`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const detail = await detailRes.json();
  const runData = detail.data?.resultData?.runData || detail.resultData?.runData || {};
  const botAtivoData = runData['Bot Ativo?'];
  console.log('Bot Ativo? saída:', JSON.stringify(botAtivoData, null, 2));
}

inspectExecution().catch(console.error);
