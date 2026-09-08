{activeTab === "relatorios" && (
          <div className="mt-6 space-y-8">
            {/* Filtro de Tempo Compacto Padronizado (Mesmo padrão de Despesas) */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-600" />
                    <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
                      Período dos Relatórios
                    </h2>
                  </div>
                  <p className="text-[11px] text-stone-500 font-sans mt-0.5">
                    Demonstrativos operacionais, faturamento e fluxo financeiro
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <PeriodFilterCompact
                    value={dateFilter as any}
                    startDate={customStartDate}
                    endDate={customEndDate}
                    onChange={(res) => {
                      setDateFilter(res.period);
                      if (res.startDate) {
                        setCustomStartDate(res.startDate);
                        customStartDateRef.current = res.startDate;
                      }
                      if (res.endDate) {
                        setCustomEndDate(res.endDate);
                        customEndDateRef.current = res.endDate;
                      }
                      fetchDashboardData();
                    }}
                    align="right"
                  />

                  <button
                    onClick={() => fetchDashboardData()}
                    className="h-9 sm:h-10 px-3 rounded-xl border border-stone-200 bg-white text-stone-700 hover:text-stone-950 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <RefreshCw size={13} className={isLoading ? 'animate-spin text-rose-600' : 'text-stone-400'} />
                    <span className="hidden sm:inline">Atualizar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Relatórios Financeiros & Faturamento */}
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Relatórios Financeiros & Faturamento
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportCard
                  title="Fluxo de Caixa"
                  value={`€ ${(dashboardData?.lucroLiquido ?? (filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0) - (expenses.reduce((s, e) => s + Number(e.amount || 0), 0)))).toFixed(2)}`}
                  icon={<TrendingUp size={11} strokeWidth={1.25} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'fluxo_caixa', title: 'Relatório de Fluxo de Caixa (Entradas vs Saídas)'})}
                  subtitle="Entradas, Saídas e Lucro"
                />
                <ReportCard
                  title="Faturamento Geral"
                  value={`€ ${filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}`}
                  icon={<DollarSign size={11} strokeWidth={1.25} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'faturamento', title: 'Faturamento Geral por Dia'})}
                  subtitle="Vendas por dia e pedidos"
                />
                <ReportCard
                  title="Pedidos no período"
                  value={`${filteredOrders.length} pedidos`}
                  icon={<Calendar size={11} strokeWidth={1.25} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'vendas_mes', title: 'Detalhamento de Pedidos'})}
                  subtitle="Lista completa de vendas"
                />
                <ReportCard
                  title="Ticket Médio"
                  value={`€ ${filteredOrders.length > 0 ? (filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0) / filteredOrders.length).toFixed(2) : '0.00'}`}
                  icon={<CreditCard size={11} strokeWidth={1.25} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'ticket_medio', title: 'Cálculo e Análise do Ticket Médio'})}
                  subtitle="Média por pedido e canais"
                />
              </div>
            </div>

            {/* Vendas por Canal, Produtos & Operação */}
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2 mb-3"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Vendas por Canal, Produtos & Operação</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportCard
                  title="Vendas de produtos"
                  value=""
                  icon={<Package size={11} strokeWidth={1.25} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'produtos', title: 'Vendas de Produtos'})}
                  subtitle="Detalhamento por item"
                />
                <ReportCard
                  title="Vendas de complementos"
                  value=""
                  icon={<UtensilsCrossed size={11} strokeWidth={1.25} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'complementos', title: 'Vendas de Complementos (Bordas e Extras)'})}
                  subtitle="Bordas e extras"
                />
                <ReportCard
                  title="Formas de Pagamento"
                  value=""
                  icon={<CreditCard size={11} strokeWidth={1.25} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'pagamentos', title: 'Formas de Pagamento'})}
                  subtitle="Distribuição"
                />
                <ReportCard
                  title="Cancelamentos"
                  value=""
                  icon={<AlertCircle size={11} strokeWidth={1.25} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'cancelamentos', title: 'Pedidos Cancelados'})}
                  subtitle="Análise de perdas"
                />
              </div>
            </div>
          </div>
        )}
        
        {reportModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-stone-200 relative">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-extrabold text-xl text-gray-900">
                  {reportModal.title}
                </h3>
                <button
                  onClick={() => setReportModal({isOpen: false, type: '', title: ''})}
                  className="p-2 bg-gray-100 rounded-full text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                {(() => {
                  let reportOrders = filteredOrders;
                  if (reportModal.type === 'cancelamentos') {
                    reportOrders = reportOrders.filter((o: any) => o.status === 'Cancelado');
                  }
                  
                  // ────────────── RELATÓRIO: FLUXO DE CAIXA ──────────────
                  if (reportModal.type === 'fluxo_caixa') {
                    const cashData = dashboardData?.chartData?.cashFlowData || [];
                    const totEntradas = cashData.reduce((acc: number, c: any) => acc + c.revenue, 0);
                    const totSaidas = cashData.reduce((acc: number, c: any) => acc + c.expenses, 0);
                    const lucroTotal = totEntradas - totSaidas;
                    const margemTotal = totEntradas > 0 ? (lucroTotal / totEntradas) * 100 : 0;

                    return (
                      <div className="space-y-6">
                        {/* Indicadores do Período */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider block mb-1">Entradas (Vendas)</span>
                            <span className="text-xl font-black font-mono text-emerald-700">€ {totEntradas.toFixed(2)}</span>
                          </div>
                          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                            <span className="text-[10px] font-mono font-bold text-rose-800 uppercase tracking-wider block mb-1">Saídas (Despesas)</span>
                            <span className="text-xl font-black font-mono text-rose-700">€ {totSaidas.toFixed(2)}</span>
                          </div>
                          <div className="p-4 bg-stone-900 border border-stone-800 rounded-xl text-white">
                            <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider block mb-1">Lucro Líquido</span>
                            <span className={`text-xl font-black font-mono ${lucroTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>€ {lucroTotal.toFixed(2)}</span>
                          </div>
                          <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl">
                            <span className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider block mb-1">Margem Líquida</span>
                            <span className="text-xl font-black font-mono text-stone-900">{margemTotal.toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Gráfico de Barras: Entradas vs Saídas */}
                        {cashData.length > 0 && (
                          <div className="bg-white p-4 border border-stone-200 rounded-xl shadow-xs">
                            <h4 className="text-xs font-mono font-bold text-stone-700 uppercase tracking-wider mb-4">Gráfico Comparativo: Entradas vs Saídas</h4>
                            <div className="h-[260px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={cashData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                  <XAxis dataKey="date" tick={{fontSize: 11, fill: '#6B7280', fontFamily: 'monospace'}} tickMargin={8} axisLine={false} tickLine={false} />
                                  <YAxis tickFormatter={(val) => `€${val}`} tick={{fontSize: 11, fill: '#6B7280', fontFamily: 'monospace'}} axisLine={false} tickLine={false} />
                                  <Tooltip 
                                    formatter={(value: number) => [`€ ${Number(value).toFixed(2)}`, '']}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'monospace' }}
                                  />
                                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                                  <Bar dataKey="revenue" name="Entradas (€ Faturamento)" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                                  <Bar dataKey="expenses" name="Saídas (€ Despesas)" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        )}

                        {/* Tabela Analítica Dia-a-Dia */}
                        <div className="overflow-x-auto border border-stone-200 rounded-xl">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-stone-50 text-stone-600 font-mono uppercase border-b border-stone-200">
                              <tr>
                                <th className="px-4 py-3 font-bold">Data</th>
                                <th className="px-4 py-3 font-bold text-center">Pedidos</th>
                                <th className="px-4 py-3 font-bold text-right text-emerald-700">Entradas</th>
                                <th className="px-4 py-3 font-bold text-right text-rose-700">Saídas</th>
                                <th className="px-4 py-3 font-bold text-right text-stone-900">Lucro Líquido</th>
                                <th className="px-4 py-3 font-bold text-right text-stone-700">Margem (%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 font-mono">
                              {cashData.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">Nenhum registro financeiro encontrado para este período.</td></tr>
                              ) : cashData.map((day: any) => (
                                <tr key={day.date} className="hover:bg-stone-50 transition-colors">
                                  <td className="px-4 py-3 font-bold text-stone-900">{day.date}</td>
                                  <td className="px-4 py-3 text-center text-stone-600">{day.orders}</td>
                                  <td className="px-4 py-3 text-right font-bold text-emerald-600">€ {day.revenue.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right font-bold text-rose-600">€ {day.expenses.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right font-bold text-stone-900">€ {day.profit.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right font-bold text-stone-600">{day.margin.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                            {cashData.length > 0 && (
                              <tfoot className="bg-stone-100 border-t border-stone-200 font-mono font-bold text-stone-900">
                                <tr>
                                  <td className="px-4 py-3 uppercase">Total Geral</td>
                                  <td className="px-4 py-3 text-center">{cashData.reduce((acc: number, c: any) => acc + c.orders, 0)}</td>
                                  <td className="px-4 py-3 text-right text-emerald-700">€ {totEntradas.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right text-rose-700">€ {totSaidas.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right text-stone-900">€ {lucroTotal.toFixed(2)}</td>
                                  <td className="px-4 py-3 text-right">{margemTotal.toFixed(1)}%</td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    );
                  }

                  // ────────────── RELATÓRIO: FATURAMENTO GERAL POR DIA ──────────────
                  if (reportModal.type === 'faturamento') {
                    const dailyMap = new Map<string, { revenue: number, count: number }>();
                    reportOrders.forEach(o => {
                      const d = safeGetDate(o.createdAt);
                      if (!d) return;
                      const dKey = d.toLocaleDateString('pt-PT');
                      if (!dailyMap.has(dKey)) dailyMap.set(dKey, { revenue: 0, count: 0 });
                      const cur = dailyMap.get(dKey)!;
                      cur.revenue += Number(o.totalAmount) || 0;
                      cur.count += 1;
                    });
                    const dailyList = Array.from(dailyMap.entries()).sort((a,b) => {
                      const pA = a[0].split('/').map(Number);
                      const pB = b[0].split('/').map(Number);
                      return new Date(pB[2], pB[1]-1, pB[0]).getTime() - new Date(pA[2], pA[1]-1, pA[0]).getTime();
                    });

                    return (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl">
                          <div>
                            <span className="text-xs font-mono font-bold text-blue-900 uppercase">Faturamento Total do Período</span>
                            <p className="text-2xl font-black font-mono text-blue-700">€ {reportOrders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}</p>
                          </div>
                          <span className="text-xs font-mono font-bold px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg">{reportOrders.length} pedidos</span>
                        </div>

                        <div>
                          <h4 className="text-xs font-mono font-bold text-stone-700 uppercase tracking-wider mb-2">Faturamento por Dia</h4>
                          <div className="overflow-x-auto border border-stone-200 rounded-xl mb-6">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-stone-50 text-stone-600 font-mono uppercase border-b border-stone-200">
                                <tr>
                                  <th className="px-4 py-3 font-bold">Data</th>
                                  <th className="px-4 py-3 font-bold text-center">Nº de Pedidos</th>
                                  <th className="px-4 py-3 font-bold text-right text-stone-700">Ticket Médio</th>
                                  <th className="px-4 py-3 font-bold text-right text-emerald-700">Total Faturado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-stone-100 font-mono">
                                {dailyList.map(([date, item]) => (
                                  <tr key={date} className="hover:bg-stone-50">
                                    <td className="px-4 py-2.5 font-bold text-stone-900">{date}</td>
                                    <td className="px-4 py-2.5 text-center text-stone-600">{item.count}</td>
                                    <td className="px-4 py-2.5 text-right font-bold text-stone-700">€ {(item.revenue / item.count).toFixed(2)}</td>
                                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600">€ {item.revenue.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-mono font-bold text-stone-700 uppercase tracking-wider mb-2">Todos os Pedidos do Período</h4>
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200 font-mono">
                                <th className="py-2.5 px-3 font-bold text-gray-700">ID</th>
                                <th className="py-2.5 px-3 font-bold text-gray-700">Data/Hora</th>
                                <th className="py-2.5 px-3 font-bold text-gray-700">Cliente</th>
                                <th className="py-2.5 px-3 font-bold text-gray-700">Tipo</th>
                                <th className="py-2.5 px-3 font-bold text-gray-700 text-right">Valor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono">
                              {reportOrders.map((o: any) => (
                                <tr key={o.id} className="hover:bg-gray-50">
                                  <td className="py-2 px-3 font-bold">#{o.id}</td>
                                  <td className="py-2 px-3 text-gray-500">{new Date(o.createdAt).toLocaleString('pt-PT')}</td>
                                  <td className="py-2 px-3 text-gray-700">{o.customerName}</td>
                                  <td className="py-2 px-3 uppercase text-[10px] text-stone-600">{o.orderType}</td>
                                  <td className="py-2 px-3 text-right font-bold text-emerald-600">€ {o.totalAmount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }

                  // ────────────── RELATÓRIO: CÁLCULO DO TICKET MÉDIO ──────────────
                  if (reportModal.type === 'ticket_medio') {
                    const totalFaturado = reportOrders.reduce((acc, o) => acc + o.totalAmount, 0);
                    const totalQtd = reportOrders.length;
                    const ticketGeral = totalQtd > 0 ? totalFaturado / totalQtd : 0;

                    // Breakdown por tipo
                    const typesMap: Record<string, { rev: number, count: number }> = {};
                    reportOrders.forEach(o => {
                      const t = o.orderType || 'balcao';
                      if (!typesMap[t]) typesMap[t] = { rev: 0, count: 0 };
                      typesMap[t].rev += o.totalAmount;
                      typesMap[t].count += 1;
                    });

                    return (
                      <div className="space-y-6">
                        {/* Caixa Didática de Cálculo */}
                        <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl">
                          <h4 className="text-xs font-mono font-bold text-amber-900 uppercase tracking-wider mb-2">Fórmula do Ticket Médio</h4>
                          <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
                            <div className="bg-white px-3 py-2 rounded-lg border border-amber-200">
                              <span className="text-[10px] text-amber-700 uppercase block font-bold">Faturamento Total</span>
                              <span className="text-lg font-black text-stone-900">€ {totalFaturado.toFixed(2)}</span>
                            </div>
                            <span className="text-xl font-black text-amber-700">÷</span>
                            <div className="bg-white px-3 py-2 rounded-lg border border-amber-200">
                              <span className="text-[10px] text-amber-700 uppercase block font-bold">Total de Pedidos</span>
                              <span className="text-lg font-black text-stone-900">{totalQtd} pedidos</span>
                            </div>
                            <span className="text-xl font-black text-amber-700">=</span>
                            <div className="bg-amber-600 text-white px-4 py-2 rounded-lg shadow-sm">
                              <span className="text-[10px] uppercase block font-bold text-amber-100">Ticket Médio Geral</span>
                              <span className="text-xl font-black">€ {ticketGeral.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown por Tipo de Pedido */}
                        <div>
                          <h4 className="text-xs font-mono font-bold text-stone-700 uppercase tracking-wider mb-2">Ticket Médio por Tipo de Atendimento</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                            {Object.entries(typesMap).map(([type, data]) => {
                              const tAvg = data.count > 0 ? data.rev / data.count : 0;
                              return (
                                <div key={type} className="bg-white p-4 border border-stone-200 rounded-xl">
                                  <span className="text-[11px] font-bold text-stone-500 uppercase block mb-1">{type === 'entrega' ? 'Entrega / Delivery' : type === 'mesa' ? 'Mesa' : 'Balcão / Retirada'}</span>
                                  <p className="text-xl font-black text-stone-900">€ {tAvg.toFixed(2)}</p>
                                  <span className="text-[10px] text-stone-400 mt-1 block">{data.count} pedidos • € {data.rev.toFixed(2)} total</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (reportModal.type === 'produtos' || reportModal.type === 'complementos') {
                    const counts: Record<string, { qty: number, rev: number }> = {};
                    reportOrders.forEach(o => {
                      const items = safeParseItems(o.items);
                      items.forEach((it: any) => {
                        if (reportModal.type === 'produtos') {
                           counts[it.name] = counts[it.name] || {qty: 0, rev: 0};
                           counts[it.name].qty += it.quantity;
                           counts[it.name].rev += (it.priceCalculated || 0) * it.quantity;
                        } else {
                           if (it.extras) {
                             it.extras.forEach((ext: any) => {
                                counts[ext.name] = counts[ext.name] || {qty: 0, rev: 0};
                                counts[ext.name].qty += it.quantity;
                                counts[ext.name].rev += ext.price * it.quantity;
                             });
                           }
                        }
                      });
                    });
                    const sorted = Object.entries(counts).sort((a,b) => b[1].rev - a[1].rev);
                    return (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="py-3 px-4 font-bold text-gray-700">Item</th>
                            <th className="py-3 px-4 font-bold text-gray-700">Qtd</th>
                            <th className="py-3 px-4 font-bold text-gray-700 text-right">Faturamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map(([name, data], idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{name}</td>
                              <td className="py-3 px-4 text-gray-600">{data.qty}</td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700">€ {data.rev.toFixed(2)}</td>
                            </tr>
                          ))}
                          {sorted.length === 0 && (
                            <tr><td colSpan={3} className="py-6 text-center text-gray-500">Nenhum dado encontrado</td></tr>
                          )}
                        </tbody>
                      </table>
                    );
                  } else if (reportModal.type === 'pagamentos') {
                     const counts: Record<string, { count: number, rev: number }> = {};
                     reportOrders.forEach(o => {
                        const pm = o.paymentMethod || 'Desconhecido';
                        counts[pm] = counts[pm] || {count: 0, rev: 0};
                        counts[pm].count++;
                        counts[pm].rev += o.totalAmount;
                     });
                     const sorted = Object.entries(counts).sort((a,b) => b[1].rev - a[1].rev);
                     return (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="py-3 px-4 font-bold text-gray-700">Forma de Pagamento</th>
                            <th className="py-3 px-4 font-bold text-gray-700">Nº Pedidos</th>
                            <th className="py-3 px-4 font-bold text-gray-700 text-right">Total Recebido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map(([pm, data], idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{pm}</td>
                              <td className="py-3 px-4 text-gray-600">{data.count}</td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700">€ {data.rev.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  }
                  
                  // For the default faturamento/vendas views, show orders list
                  return (
                    <div>
                      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl mb-4 border border-gray-200">
                         <span className="font-bold text-gray-700">Total no período:</span>
                         <span className="font-black text-2xl text-emerald-700">€ {reportOrders.reduce((acc, o: any) => acc + o.totalAmount, 0).toFixed(2)}</span>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="py-3 px-4 font-bold text-gray-700">Pedido</th>
                            <th className="py-3 px-4 font-bold text-gray-700">Data</th>
                            <th className="py-3 px-4 font-bold text-gray-700">Cliente</th>
                            <th className="py-3 px-4 font-bold text-gray-700 text-right">Valor</th>
                            <th className="py-3 px-4 font-bold text-gray-700 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportOrders.map((o: any) => (
                            <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">#{o.id}</td>
                              <td className="py-3 px-4 text-gray-600">{new Date(o.createdAt).toLocaleString('pt-PT')}</td>
                              <td className="py-3 px-4 text-gray-600">{o.customerName}</td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700">€ {o.totalAmount.toFixed(2)}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setReportModal({isOpen: false, type: '', title: ''});
                                      setEditingOrder(o);
                                    }}
                                    className="p-1.5 text-amber-700 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-200 rounded-md transition-colors cursor-pointer"
                                    title="Editar Pedido"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(o.id)}
                                    className="p-1.5 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-md transition-colors cursor-pointer"
                                    title="Excluir Pedido"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {reportOrders.length === 0 && (
                            <tr><td colSpan={5} className="py-6 text-center text-gray-500">Nenhum pedido encontrado</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Cardápio Digital Tab */}
        