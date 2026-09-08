const fs = require('fs');

const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';
const promptPath = 'C:\\\\Users\\\\herek\\\\.gemini\\\\antigravity-ide\\\\brain\\\\08a11a40-b7c1-4a0f-8239-f951345434d8\\\\scratch\\\\updated_prompt.txt';

async function main() {
  console.log('1. Lendo prompt atualizado...');
  const newPrompt = fs.readFileSync(promptPath, 'utf8');

  console.log('2. Buscando workflow atual...');
  const res = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const raw = await res.json();
  const wf = raw.data || raw;
  const agent = wf.nodes.find(n => n.name === 'AGENTE DE I.A.');
  if (!agent) {
    throw new Error('AGENTE DE I.A. não encontrado');
  }

  agent.parameters.options.systemMessage = newPrompt;
  console.log('Prompt inserido no nó do agente. Tamanho:', newPrompt.length);

  console.log('3. Salvando workflow...');
  const payload = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: {
      executionOrder: 'v1',
      saveDataErrorExecution: 'all',
      saveDataSuccessExecution: 'all',
      saveManualExecutions: true
    }
  };

  const putRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('PUT status:', putRes.status);
  if (!putRes.ok) {
    console.error('Erro no PUT:', await putRes.text());
    return;
  }

  console.log('4. Reativando workflow...');
  const actRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('Reativar status:', actRes.status);
  console.log('SUCESSO ABSOLUTO! Prompt atualizado com regras de pós-fechamento e bloqueio de repetições!');
}

main().catch(console.error);
