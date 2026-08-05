import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export const handler: Handler = async (event, context) => {
  // CORS Básico
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
  }

  // Validação de Segurança (Bearer Token)
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const SECRET_TOKEN = process.env.WHATSAPP_API_TOKEN || 'SenhaSuperSecreta41Menus2026'; 

  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Unauthorized. Invalid Token.' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    
    // Inserção Direta: Isolada do resto do sistema
    const { data, error } = await supabase.from('orders').insert([{
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      order_type: payload.order_type,
      payment_method: payload.payment_method,
      status: 'Pendente',
      total_amount: payload.total_amount,
      delivery_address: payload.delivery_address,
      delivery_zone: payload.delivery_zone,
      change_for: payload.change_for,
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
        }).eq('id', existingCustomer.id);
      } else {
        await supabase.from('customers').insert([{
          phone: payload.customer_phone,
          name: payload.customer_name,
          total_orders: 1,
          total_spent: payload.total_amount,
        }]);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, order_id: newOrder.id, tracking_code: newOrder.tracking_code })
    };

  } catch (error: any) {
    console.error('API Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: error.message }) };
  }
};
