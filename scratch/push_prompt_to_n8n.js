import fs from 'fs';

const apiKey = 'n8n_api_88a6d63bb1c68fc009cf01271f28bcaee30fc98150ea8a26ae93ef69b36d07ba413d3d92244bb4ff';
const workflowId = 'DjwyvU221XwZ0Cfb';
const promptPath = 'C:\\\\Users\\\\herek\\\\.gemini\\\\antigravity-ide\\\\brain\\\\08a11a40-b7c1-4a0f-8239-f951345434d8\\\\scratch\\\\updated_prompt.txt';

async function main() {
  console.log('Lendo prompt atualizado...');
  const newPrompt = fs.readFileSync(promptPath, 'utf8');

  console.log('Buscando workflow do n8n...');
  const getRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  if (!getRes.ok) {
    throw new Error('Falha ao buscar workflow: ' + getRes.status + ' ' + (await getRes.text()));
  }
  const wf = await getRes.json();

  const agent = wf.nodes.find(n => n.name === 'AGENTE DE I.A.');
  if (!agent) {
    throw new Error('Nó AGENTE DE I.A. não encontrado');
  }

  // Atualiza systemMessage
  if (agent.parameters.options?.systemMessage !== undefined) {
    agent.parameters.options.systemMessage = newPrompt;
  }
  if (agent.parameters.text !== undefined && agent.parameters.promptType === 'define') {
    agent.parameters.text = newPrompt;
  }

  console.log('Enviando workflow atualizado via PUT...');
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

  if (!putRes.ok) {
    throw new Error('Erro ao salvar workflow: ' + putRes.status + ' ' + (await putRes.text()));
  }
  console.log('PUT bem-sucedido! Status:', putRes.status);

  console.log('Reativando workflow...');
  const actRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  console.log('Ativação status:', actRes.status);
  console.log('PROCESSO CONCLUÍDO COM SUCESSO! Agente n8n agora possui regras de pós-fechamento e bloqueio de repetição.');
}

main().catch(err => {
  console.error('Erro na execução:', err);
  process.exit(1);
});
