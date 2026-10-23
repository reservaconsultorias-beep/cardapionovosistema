import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tipnhvpivhaerumetona.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat'
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

    const cleanPhone = String(payload.customer_phone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      return new Response(JSON.stringify({ success: false, message: 'Telefone inválido ou ausente' }), { status: 400, headers });
    }

    // Normaliza items
    let rawItems = payload.items;
    if (typeof rawItems === 'string') {
      try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
    }
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Nenhum item informado' }), { status: 400, headers });
    }

    // 🛡️ Trava Anti-Duplicação Estrita (Idempotência de 10 minutos):
    // Impede que retentativas de webhook, cliques múltiplos ou chamadas repetidas da IA criem comandas duplicadas
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const lastDigits = cleanPhone.slice(-8);

    const { data: recentOrders, error: recentErr } = await supabase
      .from('orders')
      .select('id, tracking_code, customer_phone, total_amount, status, created_at, items')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentErr && recentOrders && recentOrders.length > 0) {
      const duplicateOrder = recentOrders.find(o => {
        const oDigits = String(o.customer_phone || '').replace(/\D/g, '');
        const samePhone = oDigits.endsWith(lastDigits) || oDigits.includes(lastDigits);
        const st = String(o.status || '').toLowerCase().trim();
        const isActiveOrder = ['pendente', 'preparando', 'em preparo', 'recebido', 'pronto', 'entrega', 'saiu para entrega'].includes(st);
        
        // Compara se tem o mesmo número de itens ou valor similar
        const sameAmount = Math.abs((Number(o.total_amount) || 0) - (Number(payload.total_amount) || 0)) < 0.05;
        return samePhone && (isActiveOrder || sameAmount);
      });

      if (duplicateOrder) {
        console.warn(`[Anti-Duplicação 10min] Pedido recente já existente (#${duplicateOrder.id}) para cliente ${cleanPhone}. Retornando comanda existente.`);
        return new Response(JSON.stringify({
          success: true,
          order_id: duplicateOrder.id,
          short_id: String(duplicateOrder.id),
          tracking_code: duplicateOrder.tracking_code,
          total_amount: Number(duplicateOrder.total_amount),
          duplicate_prevented: true,
          message: 'Pedido já registrado no gestor com sucesso (proteção anti-duplicação de 10 minutos ativa).'
        }), { status: 200, headers });
      }
    }

    // 💰 Recalcula itens com base nos preços oficiais do banco
    const { data: dbMenuItems } = await supabase
      .from('menu_items')
      .select('id, name, category, price_single, price_p, price_m, price_g, is_active');
    
    const { data: dbZones } = await supabase
      .from('delivery_zones')
      .select('name, fee')
      .eq('is_active', true);

    let freeDeliveryThreshold = 35.00;
    try {
      const { data: thresholdSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'free_delivery_threshold')
        .maybeSingle();
      if (thresholdSetting && thresholdSetting.value !== undefined) {
        freeDeliveryThreshold = Number(thresholdSetting.value) || 0;
      }
    } catch (_) {}

    let recalculatedSubtotal = 0;
    const recalculatedItems = rawItems.map((item: any) => {
      let unitPrice = Number(item.priceCalculated || item.price || item.basePrice || 0);
      const qty = Math.max(1, Number(item.quantity || 1));
      
      if (dbMenuItems && dbMenuItems.length > 0) {
        const itemName = String(item.name || '').toLowerCase().trim();
        const matched = dbMenuItems.find(m => {
          const mName = String(m.name || '').toLowerCase().trim();
          return m.id === item.id || itemName === mName || (mName.length > 4 && itemName.includes(mName));
        });
        
        if (matched) {
          const size = String(item.size || '').toUpperCase().trim();
          if (size === 'P' && matched.price_p) unitPrice = Number(matched.price_p);
          else if (size === 'M' && matched.price_m) unitPrice = Number(matched.price_m);
          else if (size === 'G' && matched.price_g) unitPrice = Number(matched.price_g);
          else if (matched.price_single) unitPrice = Number(matched.price_single);
        }
      }

      let extrasCost = 0;
      if (Array.isArray(item.extras)) {
        extrasCost = item.extras.reduce((acc: number, ex: any) => acc + (Number(ex.price) || 0), 0);
      }
      const finalItemUnitPrice = Number((unitPrice + extrasCost).toFixed(2));
      recalculatedSubtotal += finalItemUnitPrice * qty;

      return {
        ...item,
        quantity: qty,
        priceCalculated: finalItemUnitPrice,
        basePrice: unitPrice
      };
    });
    recalculatedSubtotal = Number(recalculatedSubtotal.toFixed(2));

    // Determina modalidade e taxa de entrega
    const rawType = String(payload.order_type || '').toLowerCase();
    const isDelivery = rawType.includes('delivery') || rawType.includes('entrega');
    const orderType = isDelivery ? 'Delivery' : 'Retirada';

    let deliveryFee = 0;
    if (isDelivery) {
      if (freeDeliveryThreshold > 0 && recalculatedSubtotal >= freeDeliveryThreshold) {
        deliveryFee = 0; // Entrega Grátis acima do limite
      } else if (payload.delivery_zone && dbZones) {
        const matchedZone = dbZones.find(z => String(z.name || '').toLowerCase().trim() === String(payload.delivery_zone).toLowerCase().trim());
        if (matchedZone) {
          deliveryFee = Number(matchedZone.fee) || 0;
        }
      }
    }

    const finalCalculatedTotal = Number((recalculatedSubtotal + deliveryFee).toFixed(2));

    // Buscar sessão de caixa ativa se houver
    const { data: activeSession } = await supabase
      .from('cash_sessions')
      .select('id')
      .eq('status', 'aberto')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Inserção do pedido no gestor
    const { data, error } = await supabase.from('orders').insert([{
      cash_session_id: activeSession ? activeSession.id : null,
      customer_name: payload.customer_name || 'Cliente WhatsApp',
      customer_phone: cleanPhone,
      order_type: orderType,
      payment_method: payload.payment_method || 'MB WAY',
      status: 'Pendente',
      total_amount: finalCalculatedTotal,
      delivery_address: isDelivery ? (payload.delivery_address || null) : null,
      delivery_zone: isDelivery ? (payload.delivery_zone || null) : null,
      change_for: payload.payment_method === 'Numerário' || payload.payment_method === 'Dinheiro' ? (payload.change_for || null) : null,
      notes: payload.notes || null,
      items: recalculatedItems
    }]).select();

    if (error) throw error;

    const newOrder = data?.[0];

    // Atualiza CRM
    if (newOrder && cleanPhone) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, total_orders, total_spent')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingCustomer) {
        await supabase.from('customers').update({
          name: payload.customer_name || existingCustomer.name,
          total_orders: (existingCustomer.total_orders || 0) + 1,
          total_spent: (Number(existingCustomer.total_spent) || 0) + finalCalculatedTotal,
          last_order_at: new Date().toISOString(),
        }).eq('id', existingCustomer.id);
      } else {
        await supabase.from('customers').insert([{
          phone: cleanPhone,
          name: payload.customer_name || 'Cliente WhatsApp',
          total_orders: 1,
          total_spent: finalCalculatedTotal,
          last_order_at: new Date().toISOString(),
        }]);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: newOrder.id,
      short_id: String(newOrder.id),
      tracking_code: newOrder.tracking_code,
      total_amount: finalCalculatedTotal,
      subtotal: recalculatedSubtotal,
      delivery_fee: deliveryFee,
      items: recalculatedItems
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: '/.netlify/functions/whatsapp'
};
