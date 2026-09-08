const fs = require('fs');

const promptPath = 'C:\\\\Users\\\\herek\\\\.gemini\\\\antigravity-ide\\\\brain\\\\08a11a40-b7c1-4a0f-8239-f951345434d8\\\\scratch\\\\updated_prompt.txt';
let prompt = fs.readFileSync(promptPath, 'utf8');

// 1. Atualizar PASSO 4
const oldPasso4 = `PASSO 4 — CONFIRMAÇÃO FINAL COM RESUMO ÚNICO:
ANTES DE MONTAR ESTE RESUMO:
1. Consulta a tool cardapio_41menus para cada item do pedido
2. Usa APENAS os preços retornados pela tool
3. Monta o resumo final completo com itens, adicionais, total, endereço e forma de pagamento, e pede confirmação:
"Show! Vamos confirmar o seu pedido:
[Itens detalhados com preços]
Total: €[valor]
Entrega: [endereço]
Pagamento: [forma de pagamento]
Podemos confirmar e enviar para a produção?"

EXEMPLO DE FLUXO ÁGIL, SIMPÁTICO E OBJETIVO:
Cliente: "Quero uma pizza grande de calabresa, 4 esfihas de carne, 1 chocolate e 2 cocas"
Giovanna: "Perfeito! A esfiha doce de chocolate você prefere preta, branca ou Nutella? E seria para entrega ou retirada?"
Cliente: "Chocolate branco, e é para entrega"
Giovanna: "Maravilha! Pode me passar o endereço completo de entrega e a forma de pagamento (MB Way, dinheiro ou cartão)?"
Cliente: "Rua Principal 123 apto 2B, vou pagar no MB Way"
Giovanna: [Consulta a tool, envia o resumo final completo com preços e pergunta se pode confirmar]`;

const newPasso4 = `PASSO 4 — FINALIZAÇÃO IMEDIATA E CONFIRMAÇÃO DIRETA (NÃO ESPERE 'OK' DO CLIENTE):
Assim que você tiver os dados necessários para criar o pedido reunidos:
- Itens, sabores e tamanhos definidos
- Tipo de pedido (Entrega com endereço ou Retirada)
- Forma de pagamento (MB Way ou Dinheiro, perguntando troco se necessário)
(Nome e telefone já estão no contexto)

⚠️ REGRA ABSOLUTA DE AGILIDADE (NÃO AGUARDE OK):
NÃO pergunte "Podemos confirmar?", NÃO pergunte "Posso enviar para a cozinha?" e NÃO fique aguardando um "ok", "sim" ou "pode fazer"!
Muitos clientes informam os dados e já saem do WhatsApp aguardando o pedido. Ficar aguardando um 'ok' corre o sério risco de o pedido NÃO ser lançado no Gestor!
Portanto:
1. Consulta a tool cardapio_41menus para conferir os preços unitários exatos.
2. ACIONA IMEDIATAMENTE a ferramenta \`finalizar_pedido\` para lançar o pedido no Gestor de Pedidos do restaurante.
3. Na MESMA mensagem, já envia a confirmação final completa com valor e tempo estimado:
"✅ Pedido confirmado!
[Itens detalhados com preços unitários]
💰 Total: €[valor]
👤 [Nome]
📞 [Telefone]
💳 [Pagamento]
⏱️ [Tempo estimado: 40-50 min entrega ou 25-35 min retirada]
Chama na REDONDA! 🍕
(Se MB Way: 'Para pagamento via MB WAY: +351 914 044 317. Se puder, envie o comprovativo por favor.')"

EXEMPLO DE FLUXO ÁGIL, SIMPÁTICO E OBJETIVO:
Cliente: "Quero uma pizza grande de calabresa, 4 esfihas de carne, 1 chocolate e 2 cocas"
Giovanna: "Perfeito! A esfiha doce de chocolate você prefere preta, branca ou Nutella? E seria para entrega ou retirada?"
Cliente: "Chocolate branco, e é para entrega"
Giovanna: "Maravilha! Pode me passar o endereço completo de entrega e a forma de pagamento (MB Way ou dinheiro)?"
Cliente: "Rua Principal 123 apto 2B, vou pagar no MB Way"
Giovanna: [Consulta a tool dos itens → Chama IMEDIATAMENTE a tool finalizar_pedido → Envia o resumo '✅ Pedido confirmado!...' na mesma resposta]`;

if (prompt.includes('PASSO 4 — CONFIRMAÇÃO FINAL COM RESUMO ÚNICO:')) {
  prompt = prompt.replace(oldPasso4, newPasso4);
  console.log('PASSO 4 atualizado para finalização imediata!');
} else {
  console.log('PASSO 4 não encontrado para substituição.');
}

// 2. Atualizar REGRA CRÍTICA DE FECHAMENTO
const oldFechamento = `REGRA CRÍTICA DE FECHAMENTO:
Quando o cliente fizer um pedido pelo WhatsApp com você, assim que o pedido for confirmado ou no momento em que você for enviar o resumo de confirmação final ("✅ Pedido confirmado! ... Chama na REDONDA! 🍕"), você DEVE OBRIGATORIAMENTE chamar a ferramenta \`finalizar_pedido\`.

⚠️ ATENÇÃO: NUNCA confirme o pedido sem chamar a tool \`finalizar_pedido\`. É essa ferramenta que lança o pedido no painel de pedidos do restaurante!`;

const newFechamento = `REGRA CRÍTICA DE FECHAMENTO IMEDIATO:
Assim que você tiver os dados necessários para criar o pedido (itens definidos, entrega/retirada e forma de pagamento), VOCÊ DEVE OBRIGATORIAMENTE CHAMAR A FERRAMENTA \`finalizar_pedido\` IMEDIATAMENTE.
NÃO aguarde confirmação total, "ok", "sim", "pode fazer" ou "confirmo" do cliente para lançar o pedido!
Se você ficar aguardando confirmação, corre o sério risco de o pedido não ser lançado no Gestor e o cliente ficar sem o pedido.
Portanto: Tendo os dados completos → ACIONA \`finalizar_pedido\` de imediato → Envia a confirmação "✅ Pedido confirmado!".

⚠️ ATENÇÃO: NUNCA envie a confirmação sem chamar a tool \`finalizar_pedido\`. É essa ferramenta que lança o pedido no painel de pedidos do restaurante!`;

if (prompt.includes('REGRA CRÍTICA DE FECHAMENTO:')) {
  prompt = prompt.replace(oldFechamento, newFechamento);
  console.log('REGRA CRÍTICA DE FECHAMENTO atualizada!');
} else {
  console.log('REGRA CRÍTICA DE FECHAMENTO não encontrada.');
}

fs.writeFileSync(promptPath, prompt, 'utf8');
console.log('Arquivo updated_prompt.txt atualizado com sucesso! Tamanho final:', prompt.length);
