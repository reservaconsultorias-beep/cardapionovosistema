import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Unlock, Printer, BarChart3, ArrowDownCircle, ArrowUpCircle, AlertCircle, Search } from 'lucide-react';
import CashSessionDetailsModal from './reports/CashSessionDetailsModal';

export default function CaixaManager() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [summary, setSummary] = useState({ numerario: 0, mbway: 0, total: 0, count: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [closedResult, setClosedResult] = useState<any>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<any>(null);

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
      // Ao abrir o caixa, também abre a loja automaticamente
      try {
        await supabase.from('settings').upsert([
          { key: 'store_status', value: 'open', updated_at: new Date().toISOString() },
          { key: 'manual_store_closed', value: false, updated_at: new Date().toISOString() },
          { key: 'paused_until', value: '', updated_at: new Date().toISOString() },
        ], { onConflict: 'key' });
      } catch (e) {
        console.error("Erro ao atualizar status da loja:", e);
      }
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

    // Automagicamente fechar a loja
    await supabase.from('settings').upsert([
      { key: 'store_status', value: 'closed', updated_at: new Date().toISOString() },
      { key: 'paused_until', value: '', updated_at: new Date().toISOString() },
      { key: 'manual_store_closed', value: true, updated_at: new Date().toISOString() }
    ], { onConflict: 'key' });

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

  if (loading) return <div className="p-8 text-center text-zinc-500 font-mono text-xs">Carregando dados do caixa...</div>;

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">Terminal de Caixa</h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">Abertura, fechamento e conferência operacional de valores.</p>
          </div>
          {session && (
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-mono font-semibold px-2.5 py-1 rounded-md self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SESSÃO ATIVA
            </div>
          )}
        </div>

        {!session ? (
          <div className="space-y-6">
            <div className="bg-zinc-900 text-white rounded-xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-5 border border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-zinc-800 rounded-lg text-zinc-300 border border-zinc-700/60">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white tracking-tight">Caixa Fechado</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">Informe o fundo inicial de maneio para iniciar a sessão.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-44">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-semibold text-sm">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8 pr-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-mono tabular-nums text-white font-bold focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 w-full placeholder-zinc-500"
                  />
                </div>
                <button
                  onClick={handleOpen}
                  disabled={!openingAmount || parseFloat(openingAmount) < 0}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Abrir Caixa
                </button>
              </div>
            </div>

            {closedResult && (
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/80 pb-3">
                  <h4 className="font-bold text-zinc-900 text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-zinc-600" />
                    Resumo do Último Fechamento
                  </h4>
                  <button
                    onClick={() => handlePrintReport(closedResult)}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-md text-xs font-mono font-semibold transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Talão
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="bg-white p-3.5 rounded-lg border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 font-mono font-semibold uppercase tracking-wider block">Fundo Inicial</span>
                    <span className="font-bold font-mono tabular-nums text-base text-zinc-900 mt-1 block">€ {Number(closedResult.openingAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-lg border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 font-mono font-semibold uppercase tracking-wider block">Esperado</span>
                    <span className="font-bold font-mono tabular-nums text-base text-zinc-900 mt-1 block">€ {Number(closedResult.expected).toFixed(2)}</span>
                  </div>
                  <div className="bg-white p-3.5 rounded-lg border border-zinc-200">
                    <span className="text-[11px] text-zinc-500 font-mono font-semibold uppercase tracking-wider block">Informado</span>
                    <span className="font-bold font-mono tabular-nums text-base text-zinc-900 mt-1 block">€ {Number(closedResult.counted).toFixed(2)}</span>
                  </div>
                  <div className={`p-3.5 rounded-lg border ${closedResult.difference >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'}`}>
                    <span className={`text-[11px] font-mono font-semibold uppercase tracking-wider block ${closedResult.difference >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Diferença</span>
                    <span className={`font-bold font-mono tabular-nums text-base mt-1 block ${closedResult.difference >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {closedResult.difference >= 0 ? '+' : ''}€ {Number(closedResult.difference).toFixed(2)}
                    </span>
                  </div>
                </div>

                {closedResult.paySummary && (
                  <div className="bg-white p-3.5 rounded-lg border border-zinc-200 space-y-2">
                    <span className="text-[11px] text-zinc-500 font-mono font-semibold uppercase tracking-wider block">Discriminação por Meio de Pagamento</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {Object.entries(closedResult.paySummary).map(([pm, val]: any) => (
                        <div key={pm} className="bg-zinc-50 p-2.5 rounded border border-zinc-200/80">
                          <span className="text-zinc-500 font-mono block text-[11px]">{pm}</span>
                          <span className="font-bold text-zinc-900 font-mono text-sm mt-0.5 block">€ {val.toFixed(2)}</span>
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
            <div className="bg-zinc-900 text-white rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-zinc-800">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white tracking-tight">Sessão em Andamento</h3>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-emerald-500/30">Operacional</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    Aberto às {new Date(session.opened_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })} · Fundo Inicial: <span className="text-white font-bold">€ {Number(session.opening_amount).toFixed(2)}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <button
                  onClick={() => {
                    setMovementType('sangria');
                    setShowMovementModal(true);
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-rose-300 border border-rose-900/60 font-semibold px-3.5 py-2 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowDownCircle className="w-4 h-4 text-rose-400" />
                  Sangria (-)
                </button>
                <button
                  onClick={() => {
                    setMovementType('suprimento');
                    setShowMovementModal(true);
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-emerald-300 border border-emerald-900/60 font-semibold px-3.5 py-2 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                  Suprimento (+)
                </button>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ml-auto md:ml-0"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Fechar Caixa
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white border border-zinc-200 p-4 rounded-lg">
                <span className="text-[11px] text-zinc-500 font-mono font-semibold uppercase tracking-wider">Pedidos Registrados</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-1 tracking-tight">{summary.count}</p>
              </div>
              <div className="bg-white border border-zinc-200 p-4 rounded-lg">
                <span className="text-[11px] text-zinc-500 font-mono font-semibold uppercase tracking-wider">Vendas em Numerário</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-1 tracking-tight">€ {summary.numerario.toFixed(2)}</p>
              </div>
              <div className="bg-white border border-zinc-200 p-4 rounded-lg">
                <span className="text-[11px] text-zinc-500 font-mono font-semibold uppercase tracking-wider">Vendas via MB Way</span>
                <p className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-1 tracking-tight">€ {summary.mbway.toFixed(2)}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-900 p-4 rounded-lg text-white">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center justify-between">
                  Esperado na Gaveta
                  <span className="text-[10px] text-zinc-400 font-normal">Dinheiro</span>
                </span>
                <p className="text-2xl font-bold font-mono tabular-nums text-white mt-1 tracking-tight">
                  € {currentExpected.toFixed(2)}
                </p>
              </div>
            </div>

            {movements.length > 0 && (
              <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                  <h4 className="font-bold text-xs text-zinc-700 uppercase font-mono tracking-wider">Movimentações Registradas no Turno</h4>
                  <span className="text-[11px] font-mono font-semibold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded">
                    {movements.length} {movements.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>
                <div className="divide-y divide-zinc-100">
                  {movements.map((mov) => (
                    <div key={mov.id} className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-zinc-50/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${mov.type === 'sangria' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {mov.type}
                        </span>
                        <div className="text-xs">
                          <span className="font-mono text-zinc-500">{new Date(mov.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                          {mov.reason && (
                            <span className="text-zinc-800 font-medium ml-2">
                              — {mov.reason}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`font-mono font-bold tabular-nums text-sm sm:text-right ${mov.type === 'sangria' ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {mov.type === 'sangria' ? '-' : '+'} € {Number(mov.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-base text-zinc-900 tracking-tight">Histórico de Fechamentos Recentes</h3>
          <span className="text-xs text-zinc-500 font-mono">Últimas sessões arquivadas</span>
        </div>
        <div className="overflow-x-auto border border-zinc-200 rounded-lg">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 text-[11px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-50 font-semibold">
                <th className="py-2.5 px-3.5">Abertura</th>
                <th className="py-2.5 px-3.5">Fechamento</th>
                <th className="py-2.5 px-3.5">Inicial</th>
                <th className="py-2.5 px-3.5">Esperado</th>
                <th className="py-2.5 px-3.5">Contado</th>
                <th className="py-2.5 px-3.5">Diferença</th>
                <th className="py-2.5 px-3.5 text-right">Comprovante</th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-zinc-500">
                    Nenhum fechamento registrado até o momento.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="border-b border-zinc-100 hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-3.5 text-zinc-600 tabular-nums">
                      {h.opened_at ? new Date(h.opened_at).toLocaleString('pt-PT') : '-'}
                    </td>
                    <td className="py-3 px-3.5 text-zinc-600 tabular-nums">
                      {h.closed_at ? new Date(h.closed_at).toLocaleString('pt-PT') : '-'}
                    </td>
                    <td className="py-3 px-3.5 font-bold tabular-nums text-zinc-900">€ {Number(h.opening_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-3.5 font-bold tabular-nums text-zinc-900">€ {Number(h.expected_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-3.5 font-bold tabular-nums text-zinc-900">€ {Number(h.closing_counted_amount || 0).toFixed(2)}</td>
                    <td className="py-3 px-3.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold tabular-nums ${Number(h.difference || 0) >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {Number(h.difference || 0) >= 0 ? '+' : ''}€ {Number(h.difference || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedSessionForDetails(h)}
                        className="text-xs font-semibold font-mono text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-100 px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Search className="w-3 h-3 text-amber-600" />
                        Detalhes
                      </button>
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
                        className="text-xs font-semibold font-mono text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-100 px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3 h-3 text-zinc-600" />
                        Reimprimir
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
        <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-200 bg-zinc-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 tracking-tight">
                  <Lock className="w-4 h-4 text-rose-400" />
                  Fechamento e Conferência de Caixa
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">Validação física da gaveta de dinheiro</p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-600">
                  <span>Fundo Inicial de Abertura</span>
                  <span className="font-bold text-zinc-900">€ {Number(session.opening_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>(+) Vendas em Numerário</span>
                  <span className="font-bold text-zinc-900">+ € {summary.numerario.toFixed(2)}</span>
                </div>
                {totalSuprimentos > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>(+) Suprimentos de Caixa</span>
                    <span className="font-bold">+ € {totalSuprimentos.toFixed(2)}</span>
                  </div>
                )}
                {totalSangrias > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>(-) Sangrias Realizadas</span>
                    <span className="font-bold">- € {totalSangrias.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-200 flex justify-between font-bold text-zinc-900 text-sm">
                  <span>(=) Esperado em Dinheiro</span>
                  <span className="text-base">€ {currentExpected.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-bold font-mono text-zinc-600 uppercase tracking-wider">
                  Valor Contado Fisicamente (€)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-center text-3xl font-mono font-bold py-3 bg-white border-2 border-zinc-300 rounded-lg focus:border-zinc-900 focus:outline-none transition-colors tracking-tight text-zinc-900"
                    autoFocus
                  />
                </div>
              </div>

              {closingAmount !== '' && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 flex justify-between items-center font-mono">
                  <span className="text-xs text-zinc-600 font-semibold">Diferença de Caixa:</span>
                  <span className={`text-base font-bold tabular-nums ${(Number(closingAmount) - currentExpected) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {(Number(closingAmount) - currentExpected) >= 0 ? '+' : ''}
                    € {(Number(closingAmount) - currentExpected).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex gap-2.5">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-zinc-300 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-100 transition-colors text-xs font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={closingAmount === ''}
                className="flex-1 px-4 py-2.5 bg-zinc-900 text-white font-bold rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {showMovementModal && session && (
        <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md border border-zinc-200 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-200 bg-zinc-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 tracking-tight">
                  {movementType === 'sangria' ? (
                    <ArrowDownCircle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <ArrowUpCircle className="w-5 h-5 text-emerald-400" />
                  )}
                  {movementType === 'sangria' ? 'Registrar Sangria (Retirada)' : 'Registrar Suprimento (Entrada)'}
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {movementType === 'sangria' ? 'Saída de dinheiro físico da gaveta' : 'Reforço de dinheiro físico na gaveta'}
                </p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              {movementError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg flex gap-2 text-xs font-mono text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{movementError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold font-mono text-zinc-600 uppercase tracking-wider">
                  Valor da Movimentação (€) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-semibold text-base">€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xl font-mono font-bold pl-8 pr-4 py-2.5 bg-white border-2 border-zinc-300 rounded-lg focus:border-zinc-900 focus:outline-none transition-colors tracking-tight text-zinc-900 placeholder-zinc-400"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold font-mono text-zinc-600 uppercase tracking-wider">
                  Motivo / Justificativa (Opcional)
                </label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={movementType === 'sangria' ? 'Ex: Pagamento fornecedor hortifrúti' : 'Ex: Troco inicial extra'}
                  className="w-full text-xs font-sans py-2.5 px-3 bg-white border border-zinc-300 rounded-lg focus:border-zinc-900 focus:outline-none transition-colors placeholder-zinc-400"
                />
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex gap-2.5">
              <button
                onClick={() => {
                  setShowMovementModal(false);
                  setMovementError('');
                }}
                disabled={isSubmittingMovement}
                className="flex-1 px-4 py-2.5 bg-white border border-zinc-300 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-100 transition-colors text-xs font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterMovement}
                disabled={movementAmount === '' || parseFloat(movementAmount) <= 0 || isSubmittingMovement}
                className={`flex-1 px-4 py-2.5 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider cursor-pointer ${movementType === 'sangria' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
              >
                {isSubmittingMovement ? 'Gravando...' : 'Confirmar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSessionForDetails && (
        <CashSessionDetailsModal 
          session={selectedSessionForDetails} 
          onClose={() => setSelectedSessionForDetails(null)} 
        />
      )}
    </div>
  );
}
