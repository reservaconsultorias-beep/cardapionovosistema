import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, Truck, ChefHat, ArrowLeft, XCircle, Store } from 'lucide-react';
import { formatItemNameForPrint } from '../utils/printHelpers';

export default function OrderTracking() {
  const { code } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const cleanCode = code ? code.trim() : '';

    if (!cleanCode) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    async function fetchOrder() {
      try {
        const { data, error } = await supabase.rpc('get_order_by_tracking_code', { p_code: cleanCode });
        if (error) throw error;
        if (!isMounted) return;
        if (data && data.length > 0) {
          const o = data[0];
          setOrder({
            id: o.id,
            customerName: o.customer_name,
            orderType: o.order_type,
            paymentMethod: o.payment_method,
            status: o.status,
            totalAmount: o.total_amount,
            items: o.items,
            createdAt: o.created_at
          });
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch order', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchOrder();

    // Atualização automática contínua a cada 6 segundos
    const interval = setInterval(fetchOrder, 6000);

    // Atualização instantânea em tempo real via Supabase Realtime
    const channel = supabase
      .channel(`order_tracking_${cleanCode}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrder();
      })
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
        Localizando o seu pedido...
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido não encontrado</h1>
        <p className="text-gray-500 mb-6 text-sm">Verifique se o link está correto ou entre em contato com a pizzaria.</p>
        <Link to="/" className="text-red-700 font-semibold underline">Voltar ao Cardápio</Link>
      </div>
    );
  }

  const isDelivery = String(order.orderType || '').toLowerCase().includes('deliv') || String(order.orderType || '').toLowerCase().includes('entreg');

  const statusMap: Record<string, { icon: any, text: string, color: string, desc: string }> = {
    'Pendente': { 
      icon: Clock, 
      text: 'Aguardando Confirmação', 
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      desc: 'O seu pedido foi recebido e aguarda aprovação da cozinha.' 
    },
    'Em Preparo': { 
      icon: ChefHat, 
      text: 'No Forno / Em Preparo', 
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      desc: 'A nossa equipa já está a preparar as suas delícias no forno!' 
    },
    'Saiu para Entrega': { 
      icon: isDelivery ? Truck : Store, 
      text: isDelivery ? 'Saiu para Entrega' : 'Pronto para Retirada', 
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      desc: isDelivery ? 'O estafeta já recolheu a sua entrega e está a caminho!' : 'O seu pedido está pronto no balcão à sua espera!' 
    },
    'Finalizado': { 
      icon: CheckCircle, 
      text: 'Entregue / Concluído', 
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      desc: 'Pedido concluído com sucesso. Bom apetite!' 
    },
    'Cancelado': { 
      icon: XCircle, 
      text: 'Pedido Cancelado', 
      color: 'text-red-600 bg-red-50 border-red-200',
      desc: 'Este pedido foi cancelado pela pizzaria.' 
    }
  };

  const currentStatus = statusMap[order.status] || statusMap['Pendente'];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col">
        <Link to="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6">
          <ArrowLeft size={16} className="mr-1" /> Voltar ao Cardápio
        </Link>

        <div className="text-center pb-4 border-b border-gray-100">
          <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">41 Menus Delivery</span>
          <h2 className="text-2xl font-black text-gray-900 mt-1">
            Pedido #{order.id}
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Cliente: <span className="font-semibold text-gray-800">{order.customerName}</span>
          </p>
        </div>

        {/* Card Central de Status */}
        <div className="my-8 flex flex-col items-center text-center">
          <div className={`p-5 rounded-full border shadow-xs mb-4 ${currentStatus.color}`}>
            <StatusIcon size={52} />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900">
            {currentStatus.text}
          </h3>
          <p className="text-sm text-gray-500 mt-2 px-2">
            {currentStatus.desc}
          </p>
          <div className="inline-flex items-center gap-1.5 mt-4 text-[11px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Atualizando em tempo real
          </div>
        </div>

        {/* Resumo dos Itens */}
        <div className="border-t border-gray-100 pt-6 mt-auto">
          <h4 className="font-bold text-gray-900 text-sm mb-3">Resumo dos Itens</h4>
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {order.items?.map((item: any, i: number) => {
              const itemFormattedName = formatItemNameForPrint(item) || item.name || item.title;
              const itemPrice = (item.priceCalculated || item.price || 0) * (item.quantity || 1);
              return (
                <div key={i} className="flex justify-between items-start text-xs sm:text-sm py-1 border-b border-gray-50 last:border-none">
                  <span className="text-gray-700 font-medium">
                    {item.quantity}x {itemFormattedName}
                  </span>
                  <span className="font-bold text-gray-900 shrink-0 ml-2">
                    € {itemPrice.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-base font-black text-gray-900">
            <span>Total</span>
            <span className="text-emerald-700">€ {Number(order.totalAmount || 0).toFixed(2)}</span>
          </div>
          <div className="mt-2 text-xs text-gray-400 text-right">
            Forma de pagamento: <span className="font-medium text-gray-600">{order.paymentMethod}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
