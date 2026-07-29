import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Unlock } from 'lucide-react';

export default function CaixaManager() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [summary, setSummary] = useState({ numerario: 0, mbway: 0, total: 0, count: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [closedResult, setClosedResult] = useState<any>(null);

  const loadSession = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'aberto')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSession(data || null);
    setLoading(false);
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'fechado')
      .order('closed_at', { ascending: false })
      .limit(10);
    setHistory(data || []);
  };

  useEffect(() => {
    loadSession();
    loadHistory();
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      if (!session) return;
      const { data } = await supabase
        .from('orders')
        .select('payment_method, total_amount')
        .gte('created_at', session.opened_at);
      const numerario = (data || []).filter((o: any) => o.payment_method === 'Numerário').reduce((s: number, o: any) => s + Number(o.total_amount), 0);
      const mbway = (data || []).filter((o: any) => o.payment_method === 'MB Way').reduce((s: number, o: any) => s + Number(o.total_amount), 0);
      setSummary({ numerario, mbway, total: numerario + mbway, count: (data || []).length });
    };
    loadSummary();
  }, [session]);

  const handleOpen = async () => {
    const amount = parseFloat(openingAmount) || 0;
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase.from('cash_sessions').insert([{
      opening_amount: amount,
      opened_by: userData.user?.id,
      status: 'aberto'
    }]).select().single();
    if (!error && data) {
      setSession(data);
      setOpeningAmount('');
      setClosedResult(null);
    }
  };

  const handleClose = async () => {
    const counted = parseFloat(closingAmount) || 0;
    const expected = Number(session.opening_amount) + summary.numerario;
    const difference = counted - expected;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('cash_sessions').update({
      status: 'fechado',
      closed_at: new Date().toISOString(),
      closed_by: userData.user?.id,
      closing_counted_amount: counted,
      expected_amount: expected,
      difference: difference
    }).eq('id', session.id);
    if (!error) {
      setClosedResult({ expected, counted, difference });
      setSession(null);
      setClosingAmount('');
      loadHistory();
    }
  };

  if (loading) return <div className="p-8 text-center text-[#78716C] font-medium">Carregando dados do caixa...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1C1917]">Controle de Caixa</h2>
          <p className="text-sm text-[#78716C]">Abertura, fechamento e conferência diária de valores.</p>
        </div>

        {!session ? (
          <div className="space-y-6">
            <div className="bg-[#FEF2F2] border border-[#FECDD3] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#FEE2E2] rounded-xl text-[#B91C1C]">
                  <Lock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#991B1B]">Caixa Fechado</h3>
                  <p className="text-sm text-[#B91C1C]">Informe o valor inicial (fundo de maneio) para abrir a sessão de caixa.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <input
                  type="number"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="Valor Inicial (€)"
                  className="px-4 py-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20 w-full md:w-40 font-bold"
                />
                <button
                  onClick={handleOpen}
                  className="bg-[#C81E3A] hover:bg-[#A8172F] text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
                >
                  <Unlock className="w-4 h-4" />
                  Abrir Caixa
                </button>
              </div>
            </div>

            {closedResult && (
              <div className="bg-[#FAFAF9] border border-[#E7E5E1] rounded-xl p-6 space-y-3">
                <h4 className="font-bold text-[#1C1917] text-xs uppercase tracking-wide">Resumo do Último Fechamento:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg border border-[#E7E5E1]">
                    <span className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wide block">Total Esperado</span>
                    <span className="font-bold font-mono tabular-nums text-[#1C1917]">€{Number(closedResult.expected).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#E7E5E1]">
                    <span className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wide block">Total Contado</span>
                    <span className="font-bold font-mono tabular-nums text-[#1C1917]">€{Number(closedResult.counted).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-[#E7E5E1]">
                    <span className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wide block">Diferença</span>
                    <span className={`font-bold font-mono tabular-nums ${closedResult.difference >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {closedResult.difference >= 0 ? '+' : ''}€{Number(closedResult.difference).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#DCFCE7] rounded-xl text-[#15803D]">
                  <Unlock className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#166534]">Caixa Aberto</h3>
                  <p className="text-sm text-[#15803D]">
                    Aberto em {new Date(session.opened_at).toLocaleString('pt-PT')} · Valor Inicial: <span className="font-mono tabular-nums font-bold">€{Number(session.opening_amount).toFixed(2)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <input
                  type="number"
                  step="0.01"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="Valor Contado (€)"
                  className="px-4 py-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20 w-full md:w-40 font-bold"
                />
                <button
                  onClick={handleClose}
                  className="bg-[#1C1917] hover:bg-black text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
                >
                  <Lock className="w-4 h-4" />
                  Fechar Caixa
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FAFAF9] border border-[#E7E5E1] p-4 rounded-xl">
                <span className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wide">Pedidos Registrados</span>
                <p className="text-xl font-bold font-mono tabular-nums text-[#1C1917] mt-1">{summary.count}</p>
              </div>
              <div className="bg-[#FAFAF9] border border-[#E7E5E1] p-4 rounded-xl">
                <span className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wide">Vendas em Numerário</span>
                <p className="text-xl font-bold font-mono tabular-nums text-[#1C1917] mt-1">€{summary.numerario.toFixed(2)}</p>
              </div>
              <div className="bg-[#FAFAF9] border border-[#E7E5E1] p-4 rounded-xl">
                <span className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wide">Vendas via MB Way</span>
                <p className="text-xl font-bold font-mono tabular-nums text-[#1C1917] mt-1">€{summary.mbway.toFixed(2)}</p>
              </div>
              <div className="bg-[#FEF2F2] border border-[#FECDD3] p-4 rounded-xl">
                <span className="text-xs text-[#B91C1C] font-bold uppercase tracking-wide">Esperado em Dinheiro</span>
                <p className="text-xl font-bold font-mono tabular-nums text-[#B91C1C] mt-1">
                  €{(Number(session.opening_amount) + summary.numerario).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
        <h3 className="font-bold text-lg text-[#1C1917] mb-4">Histórico de Fechamentos Recentes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7E5E1] text-xs font-semibold uppercase tracking-wide text-[#A8A29E] bg-[#FAFAF9]">
                <th className="py-3 px-4 rounded-tl-lg">Abertura</th>
                <th className="py-3 px-4">Fechamento</th>
                <th className="py-3 px-4">Inicial</th>
                <th className="py-3 px-4">Esperado</th>
                <th className="py-3 px-4">Contado</th>
                <th className="py-3 px-4 rounded-tr-lg">Diferença</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#78716C]">
                    Nenhum fechamento registrado até o momento.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="border-b border-[#F0EFED] hover:bg-[#FAFAF9] transition-colors">
                    <td className="py-3.5 px-4 text-[#78716C] font-mono tabular-nums">
                      {h.opened_at ? new Date(h.opened_at).toLocaleString('pt-PT') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-[#78716C] font-mono tabular-nums">
                      {h.closed_at ? new Date(h.closed_at).toLocaleString('pt-PT') : '-'}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-[#1C1917]">€{Number(h.opening_amount || 0).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-[#1C1917]">€{Number(h.expected_amount || 0).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-[#1C1917]">€{Number(h.closing_counted_amount || 0).toFixed(2)}</td>
                    <td className={`py-3.5 px-4 font-mono tabular-nums font-bold ${Number(h.difference || 0) >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {Number(h.difference || 0) >= 0 ? '+' : ''}€{Number(h.difference || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
