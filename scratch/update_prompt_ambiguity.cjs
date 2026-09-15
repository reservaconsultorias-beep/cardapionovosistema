const fs = require('fs');

const apiKey = process.env.N8N_API_KEY;
const workflowId = 'DjwyvU221XwZ0Cfb';

async function updatePrompt() {
  console.log('Buscando workflow atual...');
  const res = await fetch(`https://funnyeagle-n8n.cloudfy.live/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': apiKey }
  });
  const data = await res.json();
  const wf = data.data || data;
  const agent = wf.nodes.find(n => n.name === 'AGENTE DE I.A.');
  
  if (!agent) throw new Error('AGENTE DE I.A. não encontrado');

  let prompt = agent.parameters.options.systemMessage;

  // Substituir a regra antiga por uma mais agressiva
  const regex = /SABOR AMBÍGUO — REGRA OBRIGATÓRIA:[\s\S]*?NUNCA assuma a categoria\. NUNCA faça as duas perguntas juntas\./g;
  
  const novaRegra = `SABOR AMBÍGUO — REGRA OBRIGATÓRIA (CRÍTICO!):
MUITOS SABORES EXISTEM TANTO COMO PIZZA QUANTO COMO ESFIHA (Ex: "Sensação", "Calabresa", "Frango", "Queijo").
Se o cliente pedir um sabor sem dizer explicitamente a palavra "PIZZA" ou "ESFIHA", VOCÊ ESTÁ ESTRITAMENTE PROIBIDA de assumir qual é e PROIBIDA de consultar preço!
PASSO 1 → Pergunte: "Você quer a PIZZA de [sabor] ou a ESFIHA de [sabor]?"
PASSO 2 → Só depois que o cliente responder, se for pizza, pergunte o tamanho: "Que tamanho? P (6 fatias), M (8 fatias) ou G (10 fatias)?"
NUNCA, JAMAIS assuma a categoria. NUNCA calcule preços de sabor ambíguo. NUNCA faça as duas perguntas (categoria e tamanho) na mesma mensagem.`;

  prompt = prompt.replace(regex, novaRegra);

  // Também no final do prompt, reforçar a regra absoluta:
  const regex2 = /REGRA ABSOLUTA[\s\S]*?Nunca assuma automaticamente\./g;
  const novaRegra2 = `REGRA ABSOLUTA DE AMBIGUIDADE (RISCO DE PREÇO ERRADO!)
Sempre que o cliente informar apenas o SABOR (ex: Sensação, Calabresa, Queijo, Frango, Prestígio), sem indicar explicitamente "pizza" ou "esfiha", considere o pedido 100% AMBÍGUO.
Se você assumir, você VAI COBRAR O PREÇO ERRADO (ex: vai cobrar 19.90 numa esfiha ou 3.50 numa pizza).
Você é OBRIGADA a perguntar: "Você se refere à PIZZA ou à ESFIHA?"
Isso vale para qualquer sabor. Nunca assuma automaticamente!`;

  prompt = prompt.replace(regex2, novaRegra2);

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

  console.log('SUCESSO! Prompt atualizado com regras estritas de ambiguidade.');
}

updatePrompt().catch(console.error);
