import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Search, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePaymentMethod, normalizeOrderType, isOrderActive } from '../../utils/paymentAndOrderHelper';

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

    let movementsData: any[] = [];
    try {
      const { data: movements, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', sessionId);
      if (!error && movements) {
        movementsData = movements;
      } else {
        throw error;
      }
    } catch (e) {
      const { data: setRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `cash_movements_${sessionId}`)
        .maybeSingle();
      if (setRow?.value) {
        try { movementsData = JSON.parse(setRow.value); } catch(err) { movementsData = []; }
      }
    }

    setSessionDetails({
      orders: (orders || []).filter(isOrderActive),
      movements: movementsData || []
    });
    setLoading(false);
  };

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative">
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-900 text-white rounded-t-2xl">
          <div>
            <h3 className="font-extrabold text-xl">
              Detalhes do Fechamento de Caixa
            </h3>
            <p className="text-stone-400 text-sm font-mono mt-1">
              Abertura: {format(new Date(session.opened_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
              {session.closed_at && ` | Fechamento: ${format(new Date(session.closed_at), "dd 'de' MMMM, HH:mm", { locale: ptBR })}`}
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
              
              {/* Resumo por Tipo de Venda */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* ENTREGA */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="bg-stone-800 text-white px-4 py-2 font-bold text-center uppercase tracking-wider text-sm">
                    Entrega
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center font-bold text-stone-700 pb-2 border-b border-stone-100">
                      <span>Número de pedidos:</span>
                      <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-900">
                        {sessionDetails?.orders.filter((o: any) => normalizeOrderType(o.order_type) === 'entrega').length}
                      </span>
                    </div>
                    {Object.entries(
                      sessionDetails?.orders.filter((o: any) => normalizeOrderType(o.order_type) === 'entrega').reduce((acc: any, o: any) => {
                        const pm = normalizePaymentMethod(o.payment_method);
                        acc[pm] = (acc[pm] || 0) + Number(o.total_amount);
                        return acc;
                      }, {}) || {}
                    ).map(([pm, val]: any) => (
                      <div key={pm} className="flex justify-between items-center text-sm font-medium text-stone-600">
                        <span>{pm}:</span>
                        <span className="tabular-nums font-mono">€ {val.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm font-bold text-amber-700 pt-2 border-t border-stone-100">
                      <span>Total Vendas Entrega:</span>
                      <span className="tabular-nums font-mono">
                        € {sessionDetails?.orders.filter((o: any) => normalizeOrderType(o.order_type) === 'entrega').reduce((acc: any, o: any) => acc + Number(o.total_amount), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* MESA */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="bg-stone-800 text-white px-4 py-2 font-bold text-center uppercase tracking-wider text-sm">
                    Mesa
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center font-bold text-stone-700 pb-2 border-b border-stone-100">
                      <span>Número de pedidos:</span>
                      <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-900">
                        {sessionDetails?.orders.filter((o: any) => normalizeOrderType(o.order_type) === 'mesa').length}
                      </span>
                    </div>
                    {Object.entries(
                      sessionDetails?.orders.filter((o: any) => normalizeOrderType(o.order_type) === 'mesa').reduce((acc: any, o: any) => {
                        const pm = normalizePaymentMethod(o.payment_method);
                        acc[pm] = (acc[pm] || 0) + Number(o.total_amount);
                        return acc;
                      }, {}) || {}
                    ).map(([pm, val]: any) => (
                      <div key={pm} className="flex justify-between items-center text-sm font-medium text-stone-600">
                        <span>{pm}:</span>
                        <span className="tabular-nums font-mono">€ {val.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm font-bold text-amber-700 pt-2 border-t border-stone-100">
                      <span>Total Vendas Mesa:</span>
                      <span className="tabular-nums font-mono">
                        € {sessionDetails?.orders.filter((o: any) => normalizeOrderType(o.order_type) === 'mesa').reduce((acc: any, o: any) => acc + Number(o.total_amount), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RETIRADA / BALCÃO */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="bg-stone-800 text-white px-4 py-2 font-bold text-center uppercase tracking-wider text-sm">
                    Retirada / Balcão
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center font-bold text-stone-700 pb-2 border-b border-stone-100">
                      <span>Número de pedidos:</span>
                      <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-900">
                        {sessionDetails?.orders.filter((o: any) => ['retirada', 'balcao'].includes(normalizeOrderType(o.order_type))).length}
                      </span>
                    </div>
                    {Object.entries(
                      sessionDetails?.orders.filter((o: any) => ['retirada', 'balcao'].includes(normalizeOrderType(o.order_type))).reduce((acc: any, o: any) => {
                        const pm = normalizePaymentMethod(o.payment_method);
                        acc[pm] = (acc[pm] || 0) + Number(o.total_amount);
                        return acc;
                      }, {}) || {}
                    ).map(([pm, val]: any) => (
                      <div key={pm} className="flex justify-between items-center text-sm font-medium text-stone-600">
                        <span>{pm}:</span>
                        <span className="tabular-nums font-mono">€ {val.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-sm font-bold text-amber-700 pt-2 border-t border-stone-100">
                      <span>Total Vendas Retirada / Balcão:</span>
                      <span className="tabular-nums font-mono">
                        € {sessionDetails?.orders.filter((o: any) => ['retirada', 'balcao'].includes(normalizeOrderType(o.order_type))).reduce((acc: any, o: any) => acc + Number(o.total_amount), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Blocos Financeiros Inferiores */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Entradas */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3">
                  <h4 className="font-bold text-stone-900 uppercase tracking-wider text-sm border-b border-stone-100 pb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Entradas (Vendas)
                  </h4>
                  {(() => {
                    const payTotals = sessionDetails?.orders.reduce((acc: any, o: any) => {
                      const pm = normalizePaymentMethod(o.payment_method);
                      acc[pm] = (acc[pm] || 0) + Number(o.total_amount);
                      return acc;
                    }, {});
                    const totalVendas = sessionDetails?.orders.reduce((acc: any, o: any) => acc + Number(o.total_amount), 0);
                    return (
                      <>
                        {Object.entries(payTotals || {}).map(([pm, val]: any) => (
                          <div key={pm} className="flex justify-between text-sm font-medium text-stone-600">
                            <span>{pm}:</span>
                            <span className="tabular-nums font-mono text-stone-900">€ {val.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t border-stone-100">
                          <span>Total Entradas:</span>
                          <span className="tabular-nums font-mono text-emerald-600">€ {totalVendas.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Movimentações */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3">
                  <h4 className="font-bold text-stone-900 uppercase tracking-wider text-sm border-b border-stone-100 pb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div> Movimentações Manuais
                  </h4>
                  {(() => {
                    const depTotals = sessionDetails?.movements.filter((m: any) => m.type === 'suprimento').reduce((a: number, m: any) => a + Number(m.amount), 0);
                    const sangTotals = sessionDetails?.movements.filter((m: any) => m.type === 'sangria').reduce((a: number, m: any) => a + Number(m.amount), 0);
                    return (
                      <>
                        <div className="flex justify-between text-sm font-medium text-stone-600">
                          <span>Depósitos (Suprimentos):</span>
                          <span className="tabular-nums font-mono text-emerald-600">+ € {depTotals.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-stone-600">
                          <span>Sangrias (Retiradas):</span>
                          <span className="tabular-nums font-mono text-rose-600">- € {sangTotals.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Em Caixa */}
                <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-3 bg-stone-900 text-white">
                  <h4 className="font-bold uppercase tracking-wider text-sm border-b border-stone-700 pb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> Conferência (Dinheiro Físico)
                  </h4>
                  {(() => {
                    const payTotals = sessionDetails?.orders.reduce((acc: any, o: any) => {
                      const pm = normalizePaymentMethod(o.payment_method);
                      acc[pm] = (acc[pm] || 0) + Number(o.total_amount);
                      return acc;
                    }, {});
                    const totalDinheiro = payTotals['Numerário'] || 0;
                    const depTotals = sessionDetails?.movements.filter((m: any) => m.type === 'suprimento').reduce((a: number, m: any) => a + Number(m.amount), 0);
                    const sangTotals = sessionDetails?.movements.filter((m: any) => m.type === 'sangria').reduce((a: number, m: any) => a + Number(m.amount), 0);
                    const fundoInicial = Number(session.opening_amount || 0);
                    const expectedCash = fundoInicial + totalDinheiro + depTotals - sangTotals;
                    const countedCash = Number(session.closing_counted_amount || 0);

                    return (
                      <>
                        <div className="flex justify-between text-sm font-medium text-stone-300">
                          <span>Fundo Inicial:</span>
                          <span className="tabular-nums font-mono text-stone-100">€ {fundoInicial.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-stone-300">
                          <span>Dinheiro em Vendas:</span>
                          <span className="tabular-nums font-mono text-stone-100">+ € {totalDinheiro.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-stone-300">
                          <span>Depósitos (Suprimentos):</span>
                          <span className="tabular-nums font-mono text-emerald-400">+ € {depTotals.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-stone-300">
                          <span>Sangrias:</span>
                          <span className="tabular-nums font-mono text-rose-400">- € {sangTotals.toFixed(2)}</span>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-stone-700">
                          <div className="flex justify-between text-sm font-bold text-stone-300 mb-1">
                            <span>Esperado em Gaveta:</span>
                            <span className="tabular-nums font-mono text-white">€ {expectedCash.toFixed(2)}</span>
                          </div>
                          {session.status === 'fechado' && (
                            <>
                              <div className="flex justify-between text-sm font-bold text-stone-300 mb-1">
                                <span>Contado no Fechamento:</span>
                                <span className="tabular-nums font-mono text-white">€ {countedCash.toFixed(2)}</span>
                              </div>
                              <div className={`flex justify-between text-sm font-bold px-2 py-1 rounded mt-2 ${session.difference_amount < 0 ? 'bg-rose-500/20 text-rose-400' : session.difference_amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-300'}`}>
                                <span>Diferença:</span>
                                <span className="tabular-nums font-mono">{session.difference_amount >= 0 ? '+' : ''}€ {Number(session.difference_amount || 0).toFixed(2)}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
