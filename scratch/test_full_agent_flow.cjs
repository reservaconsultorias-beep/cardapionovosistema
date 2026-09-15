const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tipnhvpivhaerumetona.supabase.co',
  'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat'
);

async function testMirror() {
  const testPhone = '351999888777';
  const convKey = `chat_conversation_${testPhone}`;

  // 1. Mensagem enviada pelo cliente
  console.log('1. Registrando mensagem do cliente no espelho...');
  const msg1 = {
    id: `msg_test_${Date.now()}_1`,
    sender: 'client',
    text: 'Olá Giovanna! Quero uma pizza calabresa grande para entrega na Cotovia.',
    timestamp: new Date().toISOString()
  };

  // 2. Resposta enviada pelo bot
  const msg2 = {
    id: `msg_test_${Date.now()}_2`,
    sender: 'bot',
    text: 'Olá! Anotado! 🍕 1 Pizza Calabresa Grande para a Cotovia. Como prefere pagar (MB Way ou dinheiro)?',
    timestamp: new Date(Date.now() + 2000).toISOString()
  };

  const convValue = {
    phone: testPhone,
    name: 'Cliente Teste (Giovanna)',
    paused: false,
    paused_at: null,
    last_message: msg2.text,
    last_sender: 'bot',
    updated_at: new Date().toISOString(),
    messages: [msg1, msg2]
  };

  const { error: upsertErr } = await supabase
    .from('settings')
    .upsert({
      key: convKey,
      value: convValue,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

  if (upsertErr) {
    console.error('Erro ao registrar conversa no espelho:', upsertErr);
  } else {
    console.log('✅ Conversa de teste registrada com sucesso no espelho do CRM!');
  }

  // 3. Teste de lançamento de pedido no Gestor via endpoint whatsapp
  console.log('2. Testando lançamento de pedido no Gestor...');
  const orderRes = await fetch('https://41menuspizzaria.netlify.app/.netlify/functions/whatsapp', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer SenhaSuperSecreta41Menus2026',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customer_name: 'Cliente Teste (Giovanna)',
      customer_phone: testPhone,
      order_type: 'Delivery',
      payment_method: 'MB WAY',
      total_amount: 18.90,
      delivery_address: 'Rua das Flores, 10',
      delivery_zone: 'Cotovia',
      notes: 'Teste automático do Agente de IA',
      items: [
        {
          name: 'Pizza Calabresa (Grande)',
          quantity: 1,
          priceCalculated: 18.90,
          notes: ''
        }
      ]
    })
  });

  const orderResult = await orderRes.json();
  console.log('Resultado do pedido no gestor:', orderResult);
}

testMirror().catch(console.error);
