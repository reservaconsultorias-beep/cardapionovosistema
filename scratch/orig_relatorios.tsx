{activeTab === "relatorios" && (
          <div className="mt-6 space-y-8">
            {/* Filtro de Tempo Exclusivo da Aba Relatórios */}
            <div className="flex flex-col gap-4 bg-white p-5 rounded-lg border border-stone-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-stone-900">Período de Análise</h2>
                  <p className="text-[11px] text-stone-500 font-mono mt-0.5">Selecione o filtro de tempo dos relatórios.</p>
                </div>
                <div className="flex flex-wrap items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200 self-start sm:self-auto">
                  <button onClick={() => setDateFilter("hoje")} className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-colors ${dateFilter === "hoje" ? "bg-white text-stone-900 shadow-xs border border-stone-200" : "text-stone-500 hover:text-stone-900"}`}>
                    Hoje
                  </button>
                  <button onClick={() => setDateFilter("7dias")} className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-colors ${dateFilter === "7dias" ? "bg-white text-stone-900 shadow-xs border border-stone-200" : "text-stone-500 hover:text-stone-900"}`}>
                    7 Dias
                  </button>
                  <button onClick={() => setDateFilter("mes")} className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-colors ${dateFilter === "mes" ? "bg-white text-stone-900 shadow-xs border border-stone-200" : "text-stone-500 hover:text-stone-900"}`}>
                    Mês
                  </button>
                  <button onClick={() => setDateFilter("customizado")} className={`px-3 py-1.5 text-xs font-mono font-bold rounded-md transition-colors ${dateFilter === "customizado" ? "bg-white text-stone-900 shadow-xs border border-stone-200" : "text-stone-500 hover:text-stone-900"}`}>
                    Personalizado
                  </button>
                </div>
              </div>

              {dateFilter === "customizado" && (
                <div className="pt-4 mt-2 border-t border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Data Inicial</label>
                      <input 
                        type="date" 
                        value={customStartDate} 
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Data Final</label>
                      <input 
                        type="date" 
                        value={customEndDate} 
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors" 
                      />
                    </div>
                  </div>
                  {customStartDate && customEndDate && customEndDate < customStartDate && (
                    <p className="text-[11px] font-mono font-bold text-rose-600 mb-3">
                      ⚠ A data final não pode ser anterior à data inicial.
                    </p>
                  )}
                  <button
                    onClick={() => {
                      if (!customStartDate || !customEndDate) return;
                      if (customEndDate < customStartDate) return;
                      customStartDateRef.current = customStartDate;
                      customEndDateRef.current = customEndDate;
                      fetchDashboardData();
                    }}
                    disabled={!customStartDate || !customEndDate || customEndDate < customStartDate}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-mono font-bold rounded-md transition-colors border border-rose-700 active:translate-y-px"
                  >
                    Aplicar Período
                  </button>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-bold text-stone-900 mb-4">Relatórios gerais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ReportCard
                  title="Faturamento Geral"
                  value={`€ ${filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}`}
                  icon={<DollarSign size={24} className="text-emerald-600" />}
                  iconBg="bg-emerald-50"
                  onClick={() => setReportModal({isOpen: true, type: 'faturamento', title: 'Faturamento Geral'})}
                />
                <ReportCard
                  title="Pedidos no período"
                  value={`${filteredOrders.length} pedidos`}
                  icon={<Calendar size={24} className="text-blue-600" />}
                  iconBg="bg-blue-50"
                  onClick={() => setReportModal({isOpen: true, type: 'vendas_mes', title: 'Pedidos no Período'})}
                />
                <ReportCard
                  title="Ticket Médio"
                  value={`€ ${filteredOrders.length > 0 ? (filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0) / filteredOrders.length).toFixed(2) : '0.00'}`}
                  icon={<TrendingUp size={24} className="text-orange-600" />}
                  iconBg="bg-orange-50"
                  onClick={() => setReportModal({isOpen: true, type: 'vendas_7dias', title: 'Pedidos do Período'})}
                />
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Relatórios detalhados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ReportCard
                  title="Vendas de produtos"
                  value=""
                  icon={<Package size={24} className="text-purple-600" />}
                  iconBg="bg-purple-50"
                  onClick={() => setReportModal({isOpen: true, type: 'produtos', title: 'Vendas de Produtos'})}
                  subtitle="Detalhamento por item"
                />
                <ReportCard
                  title="Vendas de complementos"
                  value=""
                  icon={<UtensilsCrossed size={24} className="text-pink-600" />}
                  iconBg="bg-pink-50"
                  onClick={() => setReportModal({isOpen: true, type: 'complementos', title: 'Vendas de Complementos (Bordas e Extras)'})}
                  subtitle="Bordas e extras"
                />
                <ReportCard
                  title="Formas de Pagamento"
                  value=""
                  icon={<CreditCard size={24} className="text-blue-600" />}
                  iconBg="bg-blue-50"
                  onClick={() => setReportModal({isOpen: true, type: 'pagamentos', title: 'Formas de Pagamento'})}
                  subtitle="Distribuição"
                />
                <ReportCard
                  title="Cancelamentos"
                  value=""
                  icon={<AlertCircle size={24} className="text-red-600" />}
                  iconBg="bg-red-50"
                  onClick={() => setReportModal({isOpen: true, type: 'cancelamentos', title: 'Pedidos Cancelados'})}
                  subtitle="Análise de perdas"
                />
              </div>
            </div>
          </div>
        )}
        
        {reportModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative">
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
        