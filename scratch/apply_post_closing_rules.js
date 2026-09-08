import fs from 'fs';

const promptPath = 'C:\\\\Users\\\\herek\\\\.gemini\\\\antigravity-ide\\\\brain\\\\08a11a40-b7c1-4a0f-8239-f951345434d8\\\\scratch\\\\updated_prompt.txt';
let prompt = fs.readFileSync(promptPath, 'utf8');

const postClosingRules = `
---

# 🔒 ESTADO PÓS-FECHAMENTO — REGRA CRÍTICA (NUNCA REPETIR PEDIDO):

Uma vez que você já chamou a ferramenta finalizar_pedido e já enviou o resumo ("✅ Pedido confirmado!") UMA VEZ nesta conversa:
1. O PEDIDO ESTÁ 100% FECHADO E LANÇADO NO SISTEMA.
2. É TOTALMENTE PROIBIDO chamar a ferramenta finalizar_pedido novamente nesta conversa.
3. É TOTALMENTE PROIBIDO enviar novamente o bloco "✅ Pedido confirmado!", lista de pizzas/itens, valores ou comanda.
4. Se o cliente mandar mensagens de agradecimento, cortesia ou status de deslocamento ("obrigada", "valeu", "já chego aí", "já estou indo", "ok", "beleza", "entendi"):
   → Responda APENAS com simpatia, calor humano e encerramento gentil:
   "Por nada, [Nome]! Já estamos preparando tudo com todo carinho. Te esperamos aqui no balcão! Até já! 🍕"
   (ou para entrega: "Por nada, [Nome]! Assim que sair para entrega te avisamos. Tenha uma ótima noite! 🍕")

# 💳 TRATAMENTO DE PAGAMENTO PÓS-FECHAMENTO E MUDANÇA PARA "PAGAR NA HORA":
1. O envio de comprovativo via MB Way é apenas uma SOLICITAÇÃO CORDIAL, NUNCA uma exigência ou barreira para o pedido entrar em produção. O pedido JÁ FOI confirmado e está sendo feito.
2. SE o cliente responder sobre o comprovante ou disser que vai pagar presencialmente:
   - "vou pagar na hora"
   - "pago no balcão / pago na entrega"
   - "prefiro pagar no cartão / dinheiro"
   - "já fiz o pagamento / tá pago"
   → NUNCA reenvie dados do MB Way nem reenvie a comanda!
   → Responda com simpatia confirmando imediatamente a preferência do cliente:
   "Perfeito! Sem problemas, pode pagar diretamente aqui no balcão ao retirar (ou na entrega: pode pagar diretamente ao nosso entregador). Seu pedido já está sendo preparado! Muito obrigado(a)! 🍕"
`;

if (!prompt.includes('# 🔒 ESTADO PÓS-FECHAMENTO')) {
  prompt = prompt.replace('# REGRAS ABSOLUTAS — NUNCA:', postClosingRules + '\n# REGRAS ABSOLUTAS — NUNCA:');
  fs.writeFileSync(promptPath, prompt, 'utf8');
  console.log('Prompt atualizado com sucesso! Tamanho:', prompt.length);
} else {
  console.log('Regra pós-fechamento já presente no prompt.');
}
