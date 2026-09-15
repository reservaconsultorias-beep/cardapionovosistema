const apiKey = process.env.N8N_API_KEY;

async function inspectEspelhoNode() {
  const detailRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/executions/3427?includeData=true`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const detail = await detailRes.json();
  const runData = detail.data?.resultData?.runData || detail.resultData?.runData || {};
  const espelhoData = runData['Espelho: Registra Cliente'];
  console.log('Espelho: Registra Cliente execução:', JSON.stringify(espelhoData, null, 2));

  const coletaData = runData['Coleta'];
  console.log('Coleta saída:', JSON.stringify(coletaData, null, 2));
}

inspectEspelhoNode().catch(console.error);
