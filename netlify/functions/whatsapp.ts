import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export default async (req, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { status: 405, headers });
  }

  // Validação de Segurança (Bearer Token)
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const SECRET_TOKEN = process.env.WHATSAPP_API_TOKEN || 'SenhaSuperSecreta41Menus2026';

  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Invalid Token.' }), { status: 401, headers });
  }

  try {
    const payload = await req.json();

    // Inserção Direta: Isolada do resto do sistema
    const { data, error } = await supabase.from('orders').insert([{
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      order_type: payload.order_type,
      payment_method: payload.payment_method,
      status: 'Pendente',
      total_amount: payload.total_amount,
      delivery_address: payload.delivery_address || null,
      delivery_zone: payload.delivery_zone || null,
      change_for: payload.change_for || null,
      notes: payload.notes || null,
      items: payload.items
    }]).select();

    if (error) throw error;

    const newOrder = data?.[0];

    // Atualiza CRM
    if (newOrder && payload.customer_phone) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, total_orders, total_spent')
        .eq('phone', payload.customer_phone)
        .maybeSingle();

      if (existingCustomer) {
        await supabase.from('customers').update({
          name: payload.customer_name,
          total_orders: (existingCustomer.total_orders || 0) + 1,
          total_spent: (Number(existingCustomer.total_spent) || 0) + payload.total_amount,
          last_order_at: new Date().toISOString(),
        }).eq('id', existingCustomer.id);
      } else {
        await supabase.from('customers').insert([{
          phone: payload.customer_phone,
          name: payload.customer_name,
          total_orders: 1,
          total_spent: payload.total_amount,
          last_order_at: new Date().toISOString(),
        }]);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: newOrder.id,
      tracking_code: newOrder.tracking_code
    }), { status: 200, headers });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: '/.netlify/functions/whatsapp'
};
