const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function checkExecutions() {
  const res = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/executions?workflowId=${workflowId}&limit=5`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  console.log('Últimas execuções:');
  const execs = data.data || data;
  execs.forEach(e => {
    console.log(`- ID: ${e.id}, Status: ${e.status}, Finished: ${e.finished}, StartedAt: ${e.startedAt}`);
  });

  if (execs.length > 0) {
    const latestId = execs[0].id;
    const detailRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/executions/${latestId}?includeData=true`, {
      headers: { 'X-N8N-API-KEY': apiKey }
    });
    const detail = await detailRes.json();
    const runData = detail.data?.resultData?.runData || detail.resultData?.runData || {};
    console.log('Nós executados na última execução:');
    Object.keys(runData).forEach(nodeName => {
      const nodeExec = runData[nodeName]?.[0];
      const hasError = nodeExec?.error;
      console.log(`  * ${nodeName}: ${hasError ? '❌ ERRO: ' + JSON.stringify(hasError.message) : '✅ OK'}`);
    });
  }
}

checkExecutions().catch(console.error);
