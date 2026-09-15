async function sendRealTestToWebhook() {
  console.log('Enviando requisição de teste simulando Evolution API para o webhook do n8n da Giovanna...');
  
  const webhookUrl = 'https://funnyeagle-n8n.cloudfy.live/webhook/5ca49874-447c-46fc-9e4a-3a2bc8f98afd';
  
  const payload = {
    event: 'messages.upsert',
    instance: 'agente1',
    data: {
      key: {
        remoteJid: '351912345678@s.whatsapp.net',
        fromMe: false,
        id: 'TESTE_' + Date.now()
      },
      pushName: 'Nériton Jr (Teste)',
      messageType: 'conversation',
      message: {
        conversation: 'Olá Giovanna! Quero uma pizza de calabresa grande para entregar na Cotovia, pagamento por MB Way.'
      }
    }
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('Status de resposta do webhook n8n:', res.status);
  const text = await res.text();
  console.log('Corpo da resposta do n8n:', text);
}

sendRealTestToWebhook().catch(console.error);
