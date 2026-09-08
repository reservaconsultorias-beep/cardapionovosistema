const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'src', 'components', 'ExpensesManager.tsx');
const lines = fs.readFileSync(targetPath, 'utf8').split('\n');

// Keep lines 0 through 484 (0-indexed), which is lines 1-485 in 1-indexed
// Line 486 (1-indexed) is `  return (` — we want everything BEFORE it
const keepLines = lines.slice(0, 485);

// Fix the import: add TrendingDown
const importLineIdx = keepLines.findIndex(l => l.includes('Building, DollarSign, Smartphone'));
if (importLineIdx !== -1) {
  keepLines[importLineIdx] = keepLines[importLineIdx].replace(
    'Building, DollarSign, Smartphone',
    'Building, DollarSign, Smartphone, TrendingDown'
  );
}

const newReturnBlock = `  return (
    <div className="max-w-7xl mx-auto font-sans h-full flex flex-col pt-1">
      
      {/* CABEÇALHO REFINADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            Despesas &amp; Saídas
          </h1>
          <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
            Lançamento e controle de custos operacionais e contas a pagar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {filteredExpenses.length > 0 && (
            <button
              onClick={handlePrintExpenses}
              title="Imprimir extrato de despesas"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              <Printer size={14} className="text-stone-500" />
              <span>Imprimir</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK NOTIFICATION */}
      {feedback && (
        <div className={\`mt-3 p-3 rounded-lg text-xs font-medium flex items-center gap-2.5 border shadow-2xs transition-all shrink-0 \${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border-rose-200'
        }\`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3-COLUMN COCKPIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 flex-1 min-h-0">
        
        {/* COLUNA ESQUERDA: KPIs & Formulário (Fixo) */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 pb-4">
          
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* Total */}
            <div className="bg-stone-950 text-white rounded-xl p-4 shadow-xs flex flex-col justify-between col-span-2">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Total</span>
                <span className="text-[10px] text-stone-500">{filteredExpenses.length} {filteredExpenses.length === 1 ? 'saída' : 'saídas'}</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-white mt-1 tabular-nums">
                € {filteredTotalAmount.toFixed(2)}
              </p>
            </div>
            
            {/* Maior Categoria */}
            <div className="bg-stone-900 text-stone-100 rounded-xl p-3 border border-stone-800 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Maior Cat.</span>
              <p className="text-sm font-bold tracking-tight truncate text-stone-200" title={topCategory.name}>
                {topCategory.name}
              </p>
              <span className="text-[10px] text-amber-400/90 font-medium tabular-nums mt-1">€ {topCategory.amount.toFixed(2)}</span>
            </div>

            {/* Média */}
            <div className="bg-stone-900 text-stone-100 rounded-xl p-3 border border-stone-800 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 mb-1">Ticket Médio</span>
              <p className="text-sm font-bold tracking-tight text-stone-200 tabular-nums">
                € {averageExpense.toFixed(2)}
              </p>
              <span className="text-[10px] text-stone-500 font-medium tabular-nums mt-1">por despesa</span>
            </div>
          </div>

          {/* Formulário Permanente */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col shrink-0">
            <div className="p-4 border-b border-stone-100 bg-stone-50/50 rounded-t-xl">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Plus size={15} className="text-amber-500" /> Nova Despesa
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3.5 flex-1">
              
              {/* Sugestões Rápidas */}
              <div className="pb-3 border-b border-stone-100">
                <span className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2">Sugestões Rápidas</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.slice(0, 5).map(sug => (
                    <button
                      key={sug.label}
                      type="button"
                      onClick={() => {
                        setDescription(sug.label);
                        setCategory(sug.cat);
                        setIsCustomCategory(false);
                      }}
                      className="px-2 py-1 text-[10px] font-medium rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-stone-700">Descrição / Fornecedor *</label>
                <input
                  ref={descInputRef}
                  type="text"
                  required
                  placeholder="Ex: Fornecedor de Queijo"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
                />
              </div>

              {/* Valor & Data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Valor (€) *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">€</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full h-9 pl-6 pr-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-bold text-stone-900 tabular-nums focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Data *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full h-9 px-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-stone-700">Categoria *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-[10px] font-semibold text-amber-700 hover:underline"
                  >
                    {isCustomCategory ? 'Escolher existente' : '+ Nova'}
                  </button>
                </div>
                {isCustomCategory ? (
                  <input
                    type="text"
                    required
                    placeholder="Nova categoria..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full h-9 px-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 focus:bg-white focus:border-stone-900 outline-none"
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Meio de Pagamento */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-stone-700">Meio de Pagamento *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => {
                    const isSelected = paymentMethod === pm.id;
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={\`h-8 flex items-center justify-center gap-1.5 rounded text-[11px] font-semibold transition-all border \${
                          isSelected 
                            ? 'bg-stone-900 text-white border-stone-900' 
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }\`}
                      >
                        <Icon size={12} className={isSelected ? 'text-amber-400' : 'text-stone-400'} />
                        <span className="truncate">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Sangria Toggle */}
              {paymentMethod === 'Dinheiro' && (
                <div className="flex items-center justify-between p-2.5 rounded bg-amber-50/50 border border-amber-200/60">
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className="text-amber-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-stone-900 leading-tight">
                      Descontar do Caixa<br/>
                      <span className="text-[9px] text-stone-500 font-normal">Registra como sangria</span>
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSangria}
                      onChange={e => setAutoSangria(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              )}

              {/* Botão de Salvar */}
              <div className="pt-3 border-t border-stone-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 bg-[#fdde58] hover:bg-[#e2c23f] disabled:opacity-50 text-stone-950 font-bold text-xs rounded-lg transition-all shadow-xs border border-[#d8ba39] flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>{submitting ? 'Salvando...' : 'Confirmar Lançamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: Filtros e Tabela (Extrato) */}
        <div className="lg:col-span-8 flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
          
          {/* BARRA DE FILTROS CONDENSADA */}
          <div className="bg-white rounded-t-xl border border-stone-200 border-b-0 p-3 shrink-0 flex flex-wrap items-center gap-2.5">
            
            {/* Busca Principal */}
            <div className="flex-1 min-w-[200px] relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar descrição ou fornecedor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-7 bg-stone-50 border border-stone-200 focus:bg-white rounded text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Categorias */}
            <div className="w-36 relative shrink-0">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className={\`w-full h-8 px-2.5 border rounded text-[11px] font-medium focus:border-stone-900 outline-none transition-colors appearance-none pr-6 \${
                  selectedCategory !== 'all' ? 'border-amber-400 bg-amber-50 text-stone-900' : 'bg-white border-stone-200'
                }\`}
              >
                <option value="all">Todas as cats.</option>
                {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>

            {/* Período */}
            <div className="w-36 relative shrink-0" ref={periodPopoverRef}>
              <button
                type="button"
                onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                className={\`w-full h-8 px-2.5 border rounded text-[11px] font-medium flex items-center justify-between gap-1 transition-colors \${
                  selectedPeriod !== 'todos' ? 'border-amber-400 bg-amber-50 text-stone-900' : 'bg-white border-stone-200'
                }\`}
              >
                <span className="truncate">{getPeriodLabel()}</span>
                <Calendar size={12} className={selectedPeriod !== 'todos' ? 'text-amber-600' : 'text-stone-400'} />
              </button>

              {isPeriodOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg border border-stone-200 shadow-lg z-30 p-2 animate-in fade-in">
                  <div className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Período</div>
                  {PERIOD_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setSelectedPeriod(opt.id); if(opt.id !== 'custom') setIsPeriodOpen(false); }}
                      className={\`w-full text-left px-2 py-1.5 rounded text-xs font-medium \${selectedPeriod === opt.id ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}\`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* TABELA COM ROLAGEM INDEPENDENTE */}
          <div className="bg-white rounded-b-xl border border-stone-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Data</th>
                    <th className="px-4 py-2.5 font-semibold">Descrição</th>
                    <th className="px-4 py-2.5 font-semibold">Categoria</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Valor</th>
                    <th className="px-4 py-2.5 font-semibold text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-[11px] font-medium text-stone-700">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        {/* ONBOARDING: EMPTY STATE */}
                        <div className="flex flex-col items-center justify-center p-12 text-center h-[300px]">
                          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 border border-amber-100 shadow-sm">
                            <TrendingDown size={20} className="text-amber-500" />
                          </div>
                          <h3 className="text-sm font-bold text-stone-900 mb-1">
                            {hasActiveFilters ? 'Nenhuma despesa nos filtros' : 'Nenhuma despesa registrada'}
                          </h3>
                          <p className="text-xs text-stone-500 max-w-[260px] mb-4 leading-relaxed">
                            {hasActiveFilters 
                              ? 'Tente remover alguns filtros para encontrar o que procura.' 
                              : 'Controle seus custos operacionais para visualizar seu lucro real com precisão.'}
                          </p>
                          {hasActiveFilters ? (
                            <button
                              onClick={handleResetFilters}
                              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors shadow-xs border border-stone-200"
                            >
                              Limpar Filtros
                            </button>
                          ) : (
                            <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 flex items-center gap-1.5 shadow-xs">
                              <span>⬅</span> Utilize o formulário ao lado para começar
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const d = new Date(exp.created_at);
                      const formattedDate = !isNaN(d.getTime()) ? d.toLocaleDateString('pt-PT').slice(0, 5) : '-';
                      const isBeingDeleted = deletingId === exp.id;

                      return (
                        <tr key={exp.id} className="hover:bg-stone-50/80 transition-colors group">
                          <td className="px-4 py-3 text-stone-500 tabular-nums">{formattedDate}</td>
                          <td className="px-4 py-3 font-semibold text-stone-900">
                            {exp.description}
                            <div className="text-[9px] text-stone-400 font-normal mt-0.5">{exp.payment_method}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-100 border border-stone-200 text-stone-600">
                              {exp.category || 'Outros'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-stone-900 tabular-nums">
                            € {Number(exp.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDelete(exp.id)}
                              disabled={isBeingDeleted}
                              className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-100 rounded transition-colors disabled:opacity-30"
                              title="Excluir despesa"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* RODAPÉ DO EXTRATO */}
            {filteredExpenses.length > 0 && (
              <div className="bg-stone-50 border-t border-stone-200 p-3 shrink-0 flex items-center justify-between text-xs font-semibold text-stone-700">
                <span>Total Filtrado ({filteredExpenses.length})</span>
                <span className="text-stone-900 text-sm tabular-nums">€ {filteredTotalAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
`;

const finalContent = keepLines.join('\n') + '\n' + newReturnBlock;
fs.writeFileSync(targetPath, finalContent, 'utf8');
console.log('Successfully updated ExpensesManager.tsx (' + finalContent.split('\n').length + ' lines)');
