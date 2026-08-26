import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Search, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashSessionDetailsModalProps {
  session: any;
  onClose: () => void;
}

export default function CashSessionDetailsModal({ session, onClose }: CashSessionDetailsModalProps) {
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (session?.id) {
      loadSessionDetails(session.id);
    }
  }, [session]);

  const loadSessionDetails = async (sessionId: string) => {
    setLoading(true);

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', session.opened_at)
      .lte('created_at', session.closed_at || new Date().toISOString());

    const { data: movements } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', sessionId);

    setSessionDetails({
      orders: orders || [],
      movements: movements || []
    });
    setLoading(false);
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-900 text-white rounded-t-2xl">
          <div>
            <h3 className="font-extrabold text-xl">
              Detalhes do Fechamento de Caixa
            </h3>
            <p className="text-stone-400 text-sm font-mono mt-1">
              Abertura: {format(new Date(session.opened_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-stone-800 rounded-full text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-stone-50">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-stone-500">
              <div className="w-8 h-8 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin mb-4" />
              <p className="font-mono animate-pulse">Carregando detalhes do caixa...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumo Financeiro */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Total em Pedidos</p>
                  <p className="text-xl font-black text-stone-900">
                    € {sessionDetails?.orders.reduce((acc: number, o: any) => acc + o.total_amount, 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-stone-400 mt-1">{sessionDetails?.orders.length} pedidos vinculados</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Suprimentos</p>
                  <p className="text-xl font-black text-emerald-600 flex items-center gap-1">
                    <ArrowUpRight size={18} />
                    € {sessionDetails?.movements.filter((m: any) => m.type === 'suprimento').reduce((acc: number, m: any) => acc + m.amount, 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Sangrias</p>
                  <p className="text-xl font-black text-rose-600 flex items-center gap-1">
                    <ArrowDownRight size={18} />
                    € {sessionDetails?.movements.filter((m: any) => m.type === 'sangria').reduce((acc: number, m: any) => acc + m.amount, 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <p className="text-xs text-stone-500 font-mono uppercase tracking-wider mb-1">Diferença Registrada</p>
                  <p className={`text-xl font-black ${session.difference_amount < 0 ? 'text-rose-600' : session.difference_amount > 0 ? 'text-emerald-600' : 'text-stone-900'}`}>
                    € {session.difference_amount ? Number(session.difference_amount).toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              {/* Lista de Pedidos */}
              <div>
                <h4 className="font-bold text-sm text-stone-900 mb-3 flex items-center gap-2">
                  <Search size={16} className="text-stone-400" /> Detalhamento de Pedidos
                </h4>
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-100 font-mono text-stone-500 text-xs border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold uppercase tracking-wider">Hora</th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-wider">Cliente</th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-wider">Pagamento</th>
                        <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Valor</th>
                        <th className="py-3 px-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {sessionDetails?.orders.length === 0 ? (
                        <tr><td colSpan={5} className="py-8 text-center text-stone-500 font-mono">Nenhum pedido atrelado</td></tr>
                      ) : (
                        sessionDetails?.orders.map((order: any) => {
                          let items = [];
                          try {
                            items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
                          } catch (e) { }

                          const isExpanded = expandedOrder === order.id;

                          return (
                            <React.Fragment key={order.id}>
                              <tr className="hover:bg-stone-50 transition-colors">
                                <td className="py-3 px-4 text-stone-500 font-mono tabular-nums">{format(new Date(order.created_at), 'HH:mm')}</td>
                                <td className="py-3 px-4 font-medium text-stone-900">{order.customer_name}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${order.payment_method === 'Numerário' ? 'bg-emerald-100 text-emerald-700' :
                                      order.payment_method === 'MB Way' ? 'bg-blue-100 text-blue-700' :
                                        'bg-purple-100 text-purple-700'
                                    }`}>
                                    {order.payment_method}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-stone-900 tabular-nums">
                                  € {Number(order.total_amount).toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right w-10">
                                  <button
                                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                    className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                  >
                                    <Search size={16} />
                                  </button>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-stone-50/50">
                                  <td colSpan={5} className="p-4 border-t border-stone-100">
                                    <div className="text-sm relative">
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="font-bold text-stone-900 text-base">Itens do Pedido:</div>
                                        <button
                                          onClick={() => setExpandedOrder(null)}
                                          className="text-xs font-bold text-stone-500 hover:text-stone-900 bg-stone-200/50 hover:bg-stone-200 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                                        >
                                          <X size={14} /> Fechar Detalhes
                                        </button>
                                      </div>
                                      <ul className="space-y-1.5 mb-3">
                                        {items.map((item: any, idx: number) => (
                                          <li key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-stone-200">
                                            <div className="flex flex-col">
                                              <span className="font-medium text-stone-800">
                                                {item.quantity}x {item.name}
                                              </span>
                                              {(item.border || item.removeItems || item.observacao) && (
                                                <span className="text-xs text-stone-500">
                                                  {[
                                                    item.border ? `Borda: ${item.border}` : null,
                                                    item.removeItems && item.removeItems.length > 0 ? `Sem: ${item.removeItems.join(', ')}` : null,
                                                    item.observacao ? `Obs: ${item.observacao}` : null
                                                  ].filter(Boolean).join(' | ')}
                                                </span>
                                              )}
                                            </div>
                                            <span className="font-mono text-stone-600">
                                              € {(Number(item.priceCalculated || item.price || 0) * Number(item.quantity || 1)).toFixed(2)}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                      <div className="grid grid-cols-2 gap-4 text-xs bg-white p-3 rounded border border-stone-200">
                                        <div>
                                          <span className="font-bold text-stone-700">Tipo:</span> {order.order_type}
                                          {order.customer_phone && <div><span className="font-bold text-stone-700">Telefone:</span> {order.customer_phone}</div>}
                                          {order.change_for > 0 && <div><span className="font-bold text-stone-700">Troco para:</span> € {Number(order.change_for).toFixed(2)}</div>}
                                        </div>
                                        <div>
                                          {(order.customer_address || order.customer_postal_code) && (
                                            <div>
                                              <span className="font-bold text-stone-700">Endereço:</span><br />
                                              {order.customer_address} {order.customer_door && `(Porta ${order.customer_door})`}<br />
                                              {order.customer_postal_code}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
