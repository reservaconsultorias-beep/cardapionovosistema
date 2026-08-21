import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Unlock, Printer, BarChart3, ArrowDownCircle, ArrowUpCircle, AlertCircle } from 'lucide-react';

export default function CaixaManager() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [summary, setSummary] = useState({ numerario: 0, mbway: 0, total: 0, count: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [closedResult, setClosedResult] = useState<any>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Estados de Movimentações
  const [movements, setMovements] = useState<any[]>([]);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'sangria' | 'suprimento'>('sangria');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);
  const [movementError, setMovementError] = useState('');

  const totalSangrias = movements.filter(m => m.type === 'sangria').reduce((acc, m) => acc + Number(m.amount), 0);
  const totalSuprimentos = movements.filter(m => m.type === 'suprimento').reduce((acc, m) => acc + Number(m.amount), 0);
  const currentExpected = session ? Number(session.opening_amount) + summary.numerario + totalSuprimentos - totalSangrias : 0;

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

  const loadMovements = async () => {
    if (!session) return;
    const { data } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false });
    setMovements(data || []);
  };

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
    loadMovements();
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

  const handleRegisterMovement = async () => {
    setMovementError('');
    const amount = parseFloat(movementAmount);
    if (!amount || amount <= 0) {
      setMovementError('O valor deve ser maior que zero.');
      return;
    }
    
    setIsSubmittingMovement(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('cash_movements').insert([{
      session_id: session.id,
      type: movementType,
      amount: amount,
      reason: movementReason || null,
      created_by: userData.user?.id
    }]);

    setIsSubmittingMovement(false);

    if (error) {
      setMovementError(error.message || 'Erro ao registrar movimentação.');
    } else {
      setShowMovementModal(false);
      setMovementAmount('');
      setMovementReason('');
      loadMovements();
    }
  };

  const handleClose = async () => {
    const counted = parseFloat(closingAmount) || 0;
    const expected = currentExpected;
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
      // Buscar dados detalhados para o relatório impresso/visual
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', session.opened_at);

      const itemsSummary: Record<string, { qty: number; total: number }> = {};
      const paySummary: Record<string, number> = {};
      let totalVendas = 0;
      let entregaCount = 0;
      let retiradaCount = 0;

      (orders || []).forEach((o: any) => {
        totalVendas += Number(o.total_amount || 0);
        const pm = o.payment_method || 'Outro';
        paySummary[pm] = (paySummary[pm] || 0) + Number(o.total_amount || 0);

        if (o.order_type === 'retirada' || o.order_type === 'Takeaway') {
          retiradaCount++;
        } else {
          entregaCount++;
        }

        let rawItems = o.items;
        if (typeof rawItems === 'string') {
          try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
        }
        if (Array.isArray(rawItems)) {
          rawItems.forEach((it: any) => {
            const name = it.name || 'Item';
            const qty = Number(it.quantity || 1);
            const price = Number(it.priceCalculated || it.price || 0) * qty;
            if (!itemsSummary[name]) itemsSummary[name] = { qty: 0, total: 0 };
            itemsSummary[name].qty += qty;
            itemsSummary[name].total += price;
          });
        }
      });

      const reportData = {
        openedAt: session.opened_at,
        closedAt: new Date().toISOString(),
        openingAmount: session.opening_amount,
        expected,
        counted,
        difference,
        ordersCount: (orders || []).length,
        totalVendas,
        paySummary,
        itemsSummary,
        entregaCount,
        retiradaCount,
        totalSangrias,
        totalSuprimentos
      };

      setClosedResult(reportData);
      setSession(null);
      setClosingAmount('');
      setShowCloseModal(false);
      loadHistory();
    }
  };

  const handlePrintReport = (report: any) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsRows = Object.entries(report.itemsSummary || {})
      .map(([name, val]: any) => `<tr><td style="padding:2px 0;">${val.qty}x ${name}</td><td style="text-align:right;padding:2px 0;">€ ${val.total.toFixed(2)}</td></tr>`)
      .join('');

    const payRows = Object.entries(report.paySummary || {})
      .map(([pm, val]: any) => `<div style="display:flex;justify-between:space-between;margin-bottom:2px;"><span>${pm}:</span><span>€ ${val.toFixed(2)}</span></div>`)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Fechamento de Caixa</title>
          <style>
            body { font-family: monospace; font-size: 13px; width: 280px; margin: 0 auto; padding: 10px; color: #000; }
            h2 { text-align: center; margin: 0 0 5px 0; font-size: 16px; font-weight: bold; }
            p { margin: 2px 0; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>41 MENU'S</h2>
          <p style="text-align:center;font-weight:bold;">RELATÓRIO DE FECHAMENTO DE CAIXA</p>
          <div class="line"></div>
          <p><b>Abertura:</b> ${new Date(report.openedAt).toLocaleString('pt-PT')}</p>
          <p><b>Fechamento:</b> ${new Date(report.closedAt).toLocaleString('pt-PT')}</p>
          <div class="line"></div>
          
          <div class="row"><span>Fundo Inicial:</span><span class="bold">€ ${Number(report.openingAmount).toFixed(2)}</span></div>
          <div class="row"><span>Total Pedidos:</span><span class="bold">${report.ordersCount} (${report.entregaCount} Entregas / ${report.retiradaCount} Retiradas)</span></div>
          <div class="row"><span>Total Vendas:</span><span class="bold">€ ${Number(report.totalVendas).toFixed(2)}</span></div>
          ${report.totalSuprimentos > 0 ? `<div class="row"><span>Suprimentos (+):</span><span class="bold" style="color:#15803D;">€ ${Number(report.totalSuprimentos).toFixed(2)}</span></div>` : ''}
          ${report.totalSangrias > 0 ? `<div class="row"><span>Sangrias (-):</span><span class="bold" style="color:#B91C1C;">€ ${Number(report.totalSangrias).toFixed(2)}</span></div>` : ''}
          
          <div class="line"></div>
          <p class="bold">FORMAS DE PAGAMENTO:</p>
          ${payRows}
          
          <div class="line"></div>
          <div class="row"><span>Esperado em Dinheiro:</span><span class="bold">€ ${Number(report.expected).toFixed(2)}</span></div>
          <div class="row"><span>Informado no Caixa:</span><span class="bold">€ ${Number(report.counted).toFixed(2)}</span></div>
          <div class="row"><span>Diferença:</span><span class="bold">${Number(report.difference) >= 0 ? '+' : ''}€ ${Number(report.difference).toFixed(2)}</span></div>
          

          
          <div class="line"></div>
          <p style="text-align:center;margin-top:15px;">--- FIM DO RELATÓRIO ---</p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
              <div className="bg-[#FAFAF9] border border-[#E7E5E1] rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-[#1C1917] text-sm uppercase tracking-wide flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Relatório Resumido do Fechamento de Caixa
                  </h4>
                  <button
                    onClick={() => handlePrintReport(closedResult)}
                    className="px-4 py-2 bg-[#1C1917] hover:bg-black text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Talão do Fechamento
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
                  <div className="bg-white p-3 rounded-lg border border-[#E7E5E1]">
                    <span className="text-xs text-[#A8A29E] font-semibold uppercase tracking-wide block">Fundo Inicial</span>
                    <span className="font-bold font-mono tabular-nums text-[#1C1917]">€{Number(closedResult.openingAmount || 0).toFixed(2)}</span>
                  </div>
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

                {closedResult.paySummary && (
                  <div className="bg-white p-4 rounded-lg border border-[#E7E5E1] space-y-2">
                    <span className="text-xs text-[#1C1917] font-bold uppercase tracking-wide block">Vendas por Forma de Pagamento</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {Object.entries(closedResult.paySummary).map(([pm, val]: any) => (
                        <div key={pm} className="bg-[#FAFAF9] p-2 rounded border border-[#E7E5E1]">
                          <span className="text-gray-500 font-medium block">{pm}</span>
                          <span className="font-bold text-gray-900 font-mono">€ {val.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

              <div className="flex flex-wrap items-center justify-end gap-3 w-full md:w-auto">
                <button
                  onClick={() => {
                    setMovementType('sangria');
                    setShowMovementModal(true);
                  }}
                  className="bg-white border border-[#E7E5E1] hover:bg-[#FAFAF9] text-[#B91C1C] font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Registrar</span> Sangria
                </button>
                <button
                  onClick={() => {
                    setMovementType('suprimento');
                    setShowMovementModal(true);
                  }}
                  className="bg-white border border-[#E7E5E1] hover:bg-[#FAFAF9] text-[#15803D] font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Registrar</span> Suprimento
                </button>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="bg-[#1C1917] hover:bg-black text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm cursor-pointer"
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
                  €{currentExpected.toFixed(2)}
                </p>
              </div>
            </div>

            {movements.length > 0 && (
              <div className="border border-[#E7E5E1] rounded-xl overflow-hidden shadow-sm">
                <div className="bg-[#FAFAF9] px-5 py-3.5 border-b border-[#E7E5E1] flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#1C1917] uppercase tracking-wide">Movimentações do Turno</h4>
                  <span className="text-xs font-semibold text-[#78716C] bg-[#E7E5E1] px-2 py-1 rounded-md">{movements.length} Registros</span>
                </div>
                <div className="divide-y divide-[#E7E5E1] bg-white">
                  {movements.map((mov) => (
                    <div key={mov.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors">
                      <div className="flex items-center gap-3">
                        {mov.type === 'sangria' ? (
                          <div className="p-2 bg-[#FEF2F2] rounded-lg text-[#B91C1C]">
                            <ArrowDownCircle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="p-2 bg-[#F0FDF4] rounded-lg text-[#15803D]">
                            <ArrowUpCircle className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className={`font-bold text-sm capitalize ${mov.type === 'sangria' ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                            {mov.type}
                          </p>
                          <p className="text-xs text-[#78716C] mt-0.5">
                            {new Date(mov.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            {mov.reason && (
                              <>
                                <span className="mx-1.5 opacity-50">•</span>
                                <span className="text-[#1C1917]">{mov.reason}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className={`font-mono font-bold tabular-nums text-lg text-right ${mov.type === 'sangria' ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                        {mov.type === 'sangria' ? '-' : '+'}€{Number(mov.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                <th className="py-3 px-4">Diferença</th>
                <th className="py-3 px-4 text-right rounded-tr-lg">Ação</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[#78716C]">
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
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={async () => {
                          const { data: orders } = await supabase.from('orders').select('*').gte('created_at', h.opened_at).lte('created_at', h.closed_at || new Date().toISOString());
                          const itemsSummary: Record<string, { qty: number; total: number }> = {};
                          const paySummary: Record<string, number> = {};
                          let totalVendas = 0;
                          let entregaCount = 0;
                          let retiradaCount = 0;
                          (orders || []).forEach((o: any) => {
                            totalVendas += Number(o.total_amount || 0);
                            const pm = o.payment_method || 'Outro';
                            paySummary[pm] = (paySummary[pm] || 0) + Number(o.total_amount || 0);
                            if (o.order_type === 'retirada' || o.order_type === 'Takeaway') retiradaCount++;
                            else entregaCount++;
                            let rawItems = o.items;
                            if (typeof rawItems === 'string') { try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; } }
                            if (Array.isArray(rawItems)) {
                              rawItems.forEach((it: any) => {
                                const name = it.name || 'Item';
                                const qty = Number(it.quantity || 1);
                                const price = Number(it.priceCalculated || it.price || 0) * qty;
                                if (!itemsSummary[name]) itemsSummary[name] = { qty: 0, total: 0 };
                                itemsSummary[name].qty += qty;
                                itemsSummary[name].total += price;
                              });
                            }
                          });
                          handlePrintReport({
                            openedAt: h.opened_at,
                            closedAt: h.closed_at,
                            openingAmount: h.opening_amount,
                            expected: h.expected_amount,
                            counted: h.closing_counted_amount,
                            difference: h.difference,
                            ordersCount: (orders || []).length,
                            totalVendas,
                            paySummary,
                            itemsSummary,
                            entregaCount,
                            retiradaCount
                          });
                        }}
                        className="text-xs font-bold text-[#1C1917] hover:underline inline-flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Relatório
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Fechamento de Caixa */}
      {showCloseModal && session && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[#B91C1C]" />
                  Fechamento de Caixa
                </h3>
                <p className="text-sm text-gray-500 mt-1">Conferência final de valores do turno</p>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="bg-[#FAFAF9] border border-[#E7E5E1] rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fundo Inicial</span>
                  <span className="font-mono font-medium">€ {Number(session.opening_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vendas em Numerário</span>
                  <span className="font-mono font-medium">+ € {summary.numerario.toFixed(2)}</span>
                </div>
                {totalSuprimentos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Suprimentos (Entradas)</span>
                    <span className="font-mono font-medium text-[#15803D]">+ € {totalSuprimentos.toFixed(2)}</span>
                  </div>
                )}
                {totalSangrias > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Sangrias (Retiradas)</span>
                    <span className="font-mono font-medium text-[#B91C1C]">- € {totalSangrias.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                  <span>Valor Esperado (Dinheiro)</span>
                  <span className="font-mono">€ {currentExpected.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Valor Contado na Gaveta (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-center text-3xl font-mono py-4 border-2 border-gray-200 rounded-xl focus:border-[#C81E3A] focus:ring-0 outline-none transition-colors"
                  autoFocus
                />
              </div>

              {closingAmount !== '' && (
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium text-gray-600">Diferença calculada:</span>
                  <span className={`font-mono text-lg font-bold ${(Number(closingAmount) - currentExpected) >= 0 ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                    {(Number(closingAmount) - currentExpected) >= 0 ? '+' : ''}
                    € {(Number(closingAmount) - currentExpected).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={closingAmount === ''}
                className="flex-1 px-4 py-3 bg-[#1C1917] text-white font-bold rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {showMovementModal && session && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-[#E7E5E1] flex justify-between items-center" style={{ backgroundColor: movementType === 'sangria' ? '#FEF2F2' : '#F0FDF4' }}>
              <div>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${movementType === 'sangria' ? 'text-[#991B1B]' : 'text-[#166534]'}`}>
                  {movementType === 'sangria' ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
                  Registrar {movementType === 'sangria' ? 'Sangria' : 'Suprimento'}
                </h3>
                <p className={`text-sm mt-1 ${movementType === 'sangria' ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                  {movementType === 'sangria' ? 'Retirada de dinheiro do caixa' : 'Reforço de dinheiro no caixa'}
                </p>
              </div>
            </div>
            
            <div className="p-6 space-y-5">
              {movementError && (
                <div className="bg-[#FEF2F2] border border-[#FECDD3] p-3 rounded-lg flex gap-2 text-sm text-[#B91C1C]">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{movementError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#1C1917] uppercase tracking-wide">
                  Valor (€) <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-lg font-mono py-3 px-4 bg-white border border-[#E7E5E1] rounded-xl focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20 outline-none transition-all shadow-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-[#1C1917] uppercase tracking-wide">
                  Motivo (Opcional)
                </label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={movementType === 'sangria' ? 'Ex: Pagamento fornecedor' : 'Ex: Troco inicial'}
                  className="w-full text-sm py-3 px-4 bg-white border border-[#E7E5E1] rounded-xl focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20 outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="p-6 bg-[#FAFAF9] border-t border-[#E7E5E1] flex gap-3">
              <button
                onClick={() => {
                  setShowMovementModal(false);
                  setMovementError('');
                }}
                disabled={isSubmittingMovement}
                className="flex-1 px-4 py-3 bg-white border border-[#E7E5E1] text-[#1C1917] font-bold rounded-xl hover:bg-[#F0EFED] transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterMovement}
                disabled={movementAmount === '' || parseFloat(movementAmount) <= 0 || isSubmittingMovement}
                className={`flex-1 px-4 py-3 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${movementType === 'sangria' ? 'bg-[#C81E3A] hover:bg-[#A8172F]' : 'bg-[#15803D] hover:bg-[#166534]'}`}
              >
                {isSubmittingMovement ? 'Registrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
