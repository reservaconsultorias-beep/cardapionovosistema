import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://tipnhvpivhaerumetona.supabase.co',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_71P_V0V6Q7x-FEw4tCFDCg_qCOwUMat'
);

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  // Token de Segurança
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const SECRET_TOKEN = process.env.WHATSAPP_API_TOKEN || 'SenhaSuperSecreta41Menus2026';

  if (!authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Invalid Token.' }), { status: 401, headers });
  }

  try {
    const url = new URL(req.url);

    // ==========================================
    // 1. GET: Buscar pedido atual do cliente
    // ==========================================
    if (req.method === 'GET') {
      const rawPhone = url.searchParams.get('phone') || '';
      const cleanPhone = rawPhone.replace(/\D/g, '');
      const orderIdParam = url.searchParams.get('order_id');

      if (!cleanPhone && !orderIdParam) {
        return new Response(JSON.stringify({ success: false, message: 'phone ou order_id obrigatório' }), { status: 400, headers });
      }

      // Considera pedidos de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase.from('orders').select('*');

      if (orderIdParam) {
        query = query.eq('id', Number(orderIdParam));
      } else {
        const lastDigits = cleanPhone.slice(-8);
        query = query
          .gte('created_at', today.toISOString())
          .ilike('customer_phone', `%${lastDigits}%`)
          .not('status', 'in', '("Finalizado","Cancelado")')
          .order('created_at', { ascending: false })
          .limit(1);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          encontrado: false,
          message: 'Nenhum pedido ativo em andamento hoje para este telefone.'
        }), { status: 200, headers });
      }

      const order = data[0];
      return new Response(JSON.stringify({
        success: true,
        encontrado: true,
        order: {
          id: order.id,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          order_type: order.order_type,
          status: order.status,
          total_amount: Number(order.total_amount),
          items: order.items,
          delivery_address: order.delivery_address,
          delivery_zone: order.delivery_zone,
          payment_method: order.payment_method,
          change_for: order.change_for,
          notes: order.notes,
          is_edited: order.is_edited,
          edit_reason: order.edit_reason,
          created_at: order.created_at
        }
      }), { status: 200, headers });
    }

    // ==========================================
    // 2. POST: Alterar ou Cancelar Pedido
    // ==========================================
    if (req.method === 'POST') {
      const payload = await req.json();
      const action = payload.action || 'update'; // 'update' | 'cancel'
      const editDescription = payload.edit_description || 'Alteração solicitada via WhatsApp';
      let orderId = Number(payload.order_id);
      let existingOrder: any = null;

      // Se não passou order_id direto, tenta encontrar pelo telefone ativo de hoje
      if (!orderId) {
        const rawPhone = payload.customer_phone || payload.phone || '';
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone && cleanPhone.length >= 8) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastDigits = cleanPhone.slice(-8);

          const { data: phoneOrders } = await supabase
            .from('orders')
            .select('*')
            .gte('created_at', today.toISOString())
            .ilike('customer_phone', `%${lastDigits}%`)
            .not('status', 'in', '("Finalizado","Cancelado")')
            .order('created_at', { ascending: false })
            .limit(1);

          if (phoneOrders && phoneOrders.length > 0) {
            existingOrder = phoneOrders[0];
            orderId = existingOrder.id;
          }
        }
      }

      if (!existingOrder) {
        if (!orderId) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'Não foi encontrado nenhum pedido ativo em andamento hoje para este telefone ou número informado.' 
          }), { status: 404, headers });
        }

        const { data: foundOrder, error: findErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (findErr || !foundOrder) {
          return new Response(JSON.stringify({ success: false, message: `Pedido #${orderId} não encontrado.` }), { status: 404, headers });
        }
        existingOrder = foundOrder;
      }

      const currentStatus = (existingOrder.status || '').trim();

      // REGRA: Se já saiu para entrega ou foi finalizado/cancelado
      if (currentStatus === 'Saiu para Entrega') {
        return new Response(JSON.stringify({
          success: false,
          pode_alterar: false,
          status: currentStatus,
          message: `O pedido #${orderId} já saiu para entrega com o motoboy e não pode mais ser alterado.`
        }), { status: 200, headers });
      }

      if (currentStatus === 'Finalizado' || currentStatus === 'Cancelado') {
        return new Response(JSON.stringify({
          success: false,
          pode_alterar: false,
          status: currentStatus,
          message: `O pedido #${orderId} já está ${currentStatus} e não pode ser modificado.`
        }), { status: 200, headers });
      }

      // CASO A: CANCELAMENTO SOLICITADO
      if (action === 'cancel') {
        if (currentStatus === 'Pendente') {
          // Cancela direto
          await supabase.from('orders').update({
            status: 'Cancelado',
            edit_reason: `Cancelado pelo cliente via WhatsApp em ${new Date().toLocaleTimeString('pt-PT')}`,
            is_edited: true,
            updated_at: new Date().toISOString()
          }).eq('id', orderId);

          return new Response(JSON.stringify({
            success: true,
            cancelado_direto: true,
            order_id: orderId,
            message: `Pedido #${orderId} foi cancelado com sucesso.`
          }), { status: 200, headers });
        } else if (currentStatus === 'Em Preparo') {
          // Solicitação de cancelamento para a equipe aprovar
          await supabase.from('orders').update({
            is_edited: true,
            edit_reason: `⚠️ [SOLICITAÇÃO DE CANCELAMENTO VIA WHATSAPP]: Cliente pediu para cancelar às ${new Date().toLocaleTimeString('pt-PT')}. Motivo: ${editDescription}`,
            updated_at: new Date().toISOString()
          }).eq('id', orderId);

          return new Response(JSON.stringify({
            success: true,
            solicitacao_enviada: true,
            order_id: orderId,
            message: `Pedido #${orderId} já está no forno. Solicitação de cancelamento enviada à equipe da cozinha.`
          }), { status: 200, headers });
        }
      }

      // CASO B: ALTERAÇÃO DE ITENS / ENDEREÇO / PAGAMENTO
      // Recálculo seguro no servidor
      let newItems = payload.items !== undefined ? payload.items : existingOrder.items;
      if (typeof newItems === 'string') {
        try { newItems = JSON.parse(newItems); } catch (_) { newItems = existingOrder.items; }
      }
      if (!Array.isArray(newItems) || newItems.length === 0) {
        newItems = existingOrder.items;
      }

      // Busca cardápio e zonas para recalcular valores com precisão
      const { data: dbMenuItems } = await supabase
        .from('menu_items')
        .select('id, name, price_single, price_p, price_m, price_g');
      
      const { data: dbZones } = await supabase
        .from('delivery_zones')
        .select('name, fee')
        .eq('is_active', true);

      let freeDeliveryThreshold = 35.00;
      try {
        const { data: stData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'free_delivery_threshold')
          .maybeSingle();
        if (stData && stData.value !== undefined) freeDeliveryThreshold = Number(stData.value) || 0;
      } catch (_) {}

      let recalculatedSubtotal = 0;
      const verifiedItems = newItems.map((item: any) => {
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

        const finalItemPrice = Number((unitPrice + extrasCost).toFixed(2));
        recalculatedSubtotal += finalItemPrice * qty;

        return {
          ...item,
          quantity: qty,
          priceCalculated: finalItemPrice,
          basePrice: unitPrice
        };
      });
      recalculatedSubtotal = Number(recalculatedSubtotal.toFixed(2));

      const newOrderType = payload.order_type || existingOrder.order_type || 'Delivery';
      const isDelivery = newOrderType.toLowerCase().includes('delivery') || newOrderType.toLowerCase().includes('entrega');
      const newZone = payload.delivery_zone !== undefined ? payload.delivery_zone : existingOrder.delivery_zone;

      let deliveryFee = 0;
      if (isDelivery) {
        if (freeDeliveryThreshold > 0 && recalculatedSubtotal >= freeDeliveryThreshold) {
          deliveryFee = 0;
        } else if (newZone && dbZones) {
          const matchedZone = dbZones.find(z => String(z.name || '').toLowerCase().trim() === String(newZone).toLowerCase().trim());
          if (matchedZone) deliveryFee = Number(matchedZone.fee) || 0;
        }
      }

      const finalTotal = Number((recalculatedSubtotal + deliveryFee).toFixed(2));

      // Se status for PENDENTE: Aplica a alteração diretamente no pedido
      if (currentStatus === 'Pendente') {
        const updateFields: any = {
          items: verifiedItems,
          total_amount: finalTotal,
          order_type: isDelivery ? 'Delivery' : 'Retirada',
          is_edited: true,
          edit_reason: `Alterado pelo cliente via WhatsApp às ${new Date().toLocaleTimeString('pt-PT')}: ${editDescription}`,
          updated_at: new Date().toISOString()
        };

        if (payload.delivery_address !== undefined) updateFields.delivery_address = payload.delivery_address;
        if (payload.delivery_zone !== undefined) updateFields.delivery_zone = payload.delivery_zone;
        if (payload.payment_method !== undefined) updateFields.payment_method = payload.payment_method;
        if (payload.change_for !== undefined) updateFields.change_for = payload.change_for;
        if (payload.notes !== undefined) updateFields.notes = payload.notes;

        const { error: updErr } = await supabase
          .from('orders')
          .update(updateFields)
          .eq('id', orderId);

        if (updErr) throw updErr;

        return new Response(JSON.stringify({
          success: true,
          alterado_direto: true,
          order_id: orderId,
          total_amount: finalTotal,
          subtotal: recalculatedSubtotal,
          delivery_fee: deliveryFee,
          status: 'Pendente',
          items: verifiedItems,
          message: `Pedido #${orderId} atualizado diretamente com sucesso.`
        }), { status: 200, headers });
      }

      // Se status for EM PREPARO: Cria solicitação para a equipe aprovar
      if (currentStatus === 'Em Preparo') {
        const solicitacaoTexto = `⚠️ [SOLICITAÇÃO DE ALTERAÇÃO VIA WHATSAPP às ${new Date().toLocaleTimeString('pt-PT')}]: ${editDescription}. Novo total proposto: €${finalTotal.toFixed(2)}`;

        const { error: reqErr } = await supabase
          .from('orders')
          .update({
            is_edited: true,
            edit_reason: solicitacaoTexto,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);

        if (reqErr) throw reqErr;

        return new Response(JSON.stringify({
          success: true,
          solicitacao_enviada: true,
          order_id: orderId,
          status: 'Em Preparo',
          total_proposto: finalTotal,
          message: `Pedido #${orderId} já está no forno. Solicitação de alteração enviada para aprovação da equipe.`
        }), { status: 200, headers });
      }

      return new Response(JSON.stringify({
        success: false,
        message: `Status atual (${currentStatus}) não permite alteração.`
      }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { status: 405, headers });

  } catch (error: any) {
    console.error('Error in order-edit endpoint:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: '/.netlify/functions/order-edit'
};
