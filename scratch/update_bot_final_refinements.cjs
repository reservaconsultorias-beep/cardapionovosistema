const fs = require('fs');

const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function applyRefinements() {
  console.log('Buscando workflow atual...');
  const res = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  const wf = data.data || data;
  
  const agent = wf.nodes.find(n => n.name === 'AGENTE DE I.A.');
  if (!agent) throw new Error('AGENTE DE I.A. não encontrado');

  let prompt = agent.parameters.options.systemMessage;

  // Remover regras antigas se existirem para evitar duplicidade
  prompt = prompt.replace(/REGRA ANTI-REPETIÇÃO[\s\S]*?(?=\n\n|$)/g, '');
  prompt = prompt.replace(/REGRA MENSAGENS PICADAS[\s\S]*?(?=\n\n|$)/g, '');

  const novasRegras = `

REGRA ANTI-REPETIÇÃO E CONTEXTO:
MUITO IMPORTANTE: Se o cliente enviar uma nova mensagem mudando de assunto, fazendo uma pergunta ou apenas comentando, NUNCA repita roboticamente a última pergunta que você fez (como "Dinheiro ou MBWay?"). Se ele não respondeu a pergunta anterior, adapte-se ao novo contexto naturalmente. Deixe para perguntar a forma de pagamento ou entrega mais tarde, fluindo com a conversa. Não aja como um robô de formulário, aja como um humano conversando.

REGRA MENSAGENS PICADAS (DEBOUNCE HUMANO):
Alguns clientes mandam mensagens "picadas", dividindo a ideia em várias mensagens curtas. Se você perceber que a mensagem recebida é apenas parte de uma frase (ex: "Oi", "Tudo bem", "Quero uma"), junte os contextos e responda de forma coesa na sua vez. Se faltar informação, converse naturalmente, mas não mande 3 mensagens seguidas para responder 3 mensagens curtas do cliente. Agrupe tudo mentalmente em UMA resposta.`;

  prompt = prompt + novasRegras;

  agent.parameters.options.systemMessage = prompt;

  console.log('Salvando workflow...');
  const putRes = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: wf.name,
      nodes: wf.nodes,
      connections: wf.connections,
      settings: {
        executionOrder: 'v1',
        saveDataErrorExecution: 'all',
        saveDataSuccessExecution: 'all',
        saveManualExecutions: true
      }
    })
  });

  if (!putRes.ok) throw new Error('Erro PUT: ' + await putRes.text());

  await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': apiKey }
  });

  console.log('SUCESSO! Prompt do Agente atualizado com Debounce Humano e Anti-Repetição.');
}

applyRefinements().catch(console.error);
