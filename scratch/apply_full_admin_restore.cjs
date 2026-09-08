const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// 1. Ensure PAGE_TITLES includes despesas and funil
if (!content.includes("'despesas':")) {
  content = content.replace(
    "'caixa': { title: 'Caixa', subtitle: 'Fluxo e fechamento' },",
    `'caixa': { title: 'Caixa', subtitle: 'Fluxo e fechamento' },
    'despesas': { title: 'Despesas', subtitle: 'Gerencie as saídas do caixa' },
    'funil': { title: 'Funil de Vendas', subtitle: 'Jornada do cliente e conversão' },`
  );
}

// 2. Sidebar Brand Colors (#fdde58) and Missing Tabs (Despesas, Funil)
// Replace old sidebar items
const oldSidebarStart = '<div className="p-3 flex-1 space-y-1.5 font-sans text-sm">';
const oldSidebarEnd = '<p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-2">Cardápio</p>';

const sIdx = content.indexOf(oldSidebarStart);
const eIdx = content.indexOf(oldSidebarEnd);

if (sIdx !== -1 && eIdx !== -1) {
  const newSidebarContent = `<div className="p-3 flex-1 space-y-1 font-sans text-sm overflow-y-auto hide-scrollbar">
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("visao-geral")} 
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'visao-geral' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <LayoutDashboard size={18} className={activeTab === 'visao-geral' ? 'text-stone-950' : 'text-stone-400'} />
              Visão Geral
            </button>
          )}
          {hasPermission('ver_pedidos') && (
            <button 
              onClick={() => setActiveTab("pedidos")} 
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'pedidos' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <ShoppingBag size={18} className={activeTab === 'pedidos' ? 'text-stone-950' : 'text-stone-400'} />
              Pedidos
            </button>
          )}
          {hasPermission('gerenciar_caixa') && (
            <button 
              onClick={() => setActiveTab("caixa")} 
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'caixa' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <CreditCard size={18} className={activeTab === 'caixa' ? 'text-stone-950' : 'text-stone-400'} />
              Caixa
            </button>
          )}
          {hasPermission('gerenciar_caixa') && (
            <button 
              onClick={() => setActiveTab("despesas")} 
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'despesas' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <TrendingDown size={18} className={activeTab === 'despesas' ? 'text-stone-950' : 'text-stone-400'} />
              Despesas
            </button>
          )}
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("relatorios")} 
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'relatorios' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <BarChart3 size={18} className={activeTab === 'relatorios' ? 'text-stone-950' : 'text-stone-400'} />
              Relatórios
            </button>
          )}
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("funil")} 
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'funil' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <Filter size={18} className={activeTab === 'funil' ? 'text-stone-950' : 'text-stone-400'} />
              Funil de Vendas
            </button>
          )}
          {hasPermission('ver_clientes') && (
            <button 
              onClick={() => setActiveTab("clientes")} 
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'clientes' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <Users size={18} className={activeTab === 'clientes' ? 'text-stone-950' : 'text-stone-400'} />
              Clientes
            </button>
          )}
          
          {(hasPermission('gerenciar_produtos') || hasPermission('gerenciar_categorias')) && (
            <div className="pt-3 mt-3 border-t border-stone-800/80 space-y-1">
              <p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-2">Cardápio</p>`;

  content = content.substring(0, sIdx) + newSidebarContent + content.substring(eIdx + oldSidebarEnd.length);
  console.log('Sidebar updated with brand yellow and all tabs!');
} else {
  console.log('Sidebar markers not found:', sIdx, eIdx);
}

// 3. Cardápio section and Banner in sidebar - change to #fdde58
content = content.replace(
  /\${activeTab === 'cardapio-digital' \? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white\/60 hover:text-white hover:bg-stone-900\/50'}/g,
  "${activeTab === 'cardapio-digital' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}"
);
content = content.replace(
  /\${activeTab === 'gestao-cardapio' \? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white\/60 hover:text-white hover:bg-stone-900\/50'}/g,
  "${activeTab === 'gestao-cardapio' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}"
);
content = content.replace(
  /\${activeTab === 'categorias' \? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white\/60 hover:text-white hover:bg-stone-900\/50'}/g,
  "${activeTab === 'categorias' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}"
);
content = content.replace(
  /\${activeTab === 'banner-promocional' \? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white\/60 hover:text-white hover:bg-stone-900\/50'}/g,
  "${activeTab === 'banner-promocional' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}"
);

// 4. Update Header Section: omit title for ['despesas', 'relatorios', 'caixa', 'funil'] and make logout button compact
const oldHeader = `<div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-stone-200/80 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              {PAGE_TITLES[activeTab]?.title || 'Painel'}
            </h1>
            <p className="text-xs text-stone-500 font-mono mt-0.5">
              {PAGE_TITLES[activeTab]?.subtitle || ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {adminLogoUrl && (
              <>
                <img src={adminLogoUrl} alt="Logo do restaurante" className="h-8 object-contain" />
                <div className="w-px h-6 bg-stone-200" />
              </>
            )}
            <button onClick={handleLogout} className="px-3.5 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-900 rounded-md font-semibold text-xs font-mono transition-colors cursor-pointer shadow-xs">
              Sair do Sistema
            </button>
          </div>
        </div>`;

const newHeader = `<div className={\`flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 \${['despesas', 'relatorios', 'caixa', 'funil'].includes(activeTab) ? 'border-b border-transparent mb-0' : 'border-b border-stone-200/80 mb-4'}\`}>
          {!['despesas', 'relatorios', 'caixa', 'funil'].includes(activeTab) ? (
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">
                {PAGE_TITLES[activeTab]?.title || 'Painel'}
              </h1>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                {PAGE_TITLES[activeTab]?.subtitle || ''}
              </p>
            </div>
          ) : <div />}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {adminLogoUrl && (
              <>
                <img src={adminLogoUrl} alt="Logo do restaurante" className="h-7 object-contain" />
                <div className="w-px h-5 bg-stone-200" />
              </>
            )}
            <button 
              onClick={handleLogout} 
              className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
              title="Sair do Sistema"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline text-[11px]">Sair</span>
            </button>
          </div>
        </div>`;

if (content.includes(oldHeader)) {
  content = content.replace(oldHeader, newHeader);
  console.log('Header section updated with compact logout and clean title logic!');
} else {
  console.log('Old header not found exactly, attempting regex');
}

// 5. Sidebar Logo 41 Menus
const oldLogoArea = `<div className="p-4 border-b border-stone-800/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold font-mono text-white text-base shadow-xs">
          41
        </div>
        <div>
          <h1 className="font-bold text-sm text-white leading-tight">41 Menu's</h1>
          <span className="text-[10px] font-mono text-white/50">Delivery & Balcão</span>
        </div>
      </div>`;

const newLogoArea = `<div className="p-3 border-b border-stone-800/80 bg-stone-950 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-900 flex items-center justify-center border border-stone-800 shrink-0">
          <img src="/39-41menus.png" alt="41 Menus" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-white leading-tight">41 Menu's</h1>
          <span className="text-[10px] font-mono text-[#fdde58] font-semibold tracking-wide">Delivery & PDV 2.0</span>
        </div>
      </div>`;

if (content.includes(oldLogoArea)) {
  content = content.replace(oldLogoArea, newLogoArea);
  console.log('Sidebar logo updated to official 41 Menus!');
}

// 6. CONTENT TABS: Despesas, Funil, and modernized Relatórios
// Let's insert Despesas and Funil tabs before Caixa
const caixaTabMarker = '{activeTab === "caixa" && hasPermission(\'gerenciar_caixa\') && (';
if (content.includes(caixaTabMarker) && !content.includes('{activeTab === "funil"')) {
  const tabsInsert = `{/* FUNIL DE VENDAS */}
        {activeTab === "funil" && (
          <div className="mt-1">
            <SalesFunnelManager onNavigateToTab={(t) => setActiveTab(t)} />
          </div>
        )}

        {/* DESPESAS */}
        {activeTab === "despesas" && hasPermission('gerenciar_caixa') && (
          <div className="mt-1">
            <ExpensesManager 
              expenses={expenses}
              onExpenseChange={fetchDashboardData}
            />
          </div>
        )}

        `;
  content = content.replace(caixaTabMarker, tabsInsert + caixaTabMarker);
  console.log('Funil and Despesas tabs inserted into content area!');
}

// 7. Update Relatórios tab to use rel_block.txt
const relBlock = fs.readFileSync('rel_block.txt', 'utf8');
const oldRelStart = '{activeTab === "relatorios" && (';
const oldRelEnd = '{activeTab === "cardapio-digital" && (';
const rSIdx = content.indexOf(oldRelStart);
const rEIdx = content.indexOf(oldRelEnd);

if (rSIdx !== -1 && rEIdx !== -1) {
  content = content.substring(0, rSIdx) + relBlock + '\n\n        ' + content.substring(rEIdx);
  console.log('Relatórios tab updated with modern PeriodFilterCompact and full analytics charts!');
}

// 8. Add PDV Button to Pedidos Tab Header and <PDVModal /> at bottom
if (!content.includes('NOVO PEDIDO (PDV)')) {
  const oldPedidosHeader = `<div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-stone-900">Gestor de Pedidos</h2>
                <div className="text-[11px] font-mono text-stone-500">
                  Total: <span className="font-bold tabular-nums text-stone-900">{dashboardData?.recentOrders?.length || 0}</span> pedidos
                </div>
              </div>`;
  const newPedidosHeader = `<div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-sm font-bold text-stone-900">Gestor de Pedidos</h2>
                  <div className="text-[11px] font-mono text-stone-500">
                    Total: <span className="font-bold tabular-nums text-stone-900">{dashboardData?.recentOrders?.length || 0}</span> pedidos
                  </div>
                </div>
                <button
                  onClick={() => setShowPDVModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#fdde58] hover:bg-[#e2c23f] active:bg-[#d8ba39] text-stone-950 rounded-lg text-xs font-bold font-mono tracking-wide shadow-sm hover:shadow transition-all cursor-pointer border border-[#d8ba39]"
                >
                  <Plus size={16} className="stroke-[2.5]" />
                  <span>NOVO PEDIDO (PDV)</span>
                </button>
              </div>`;
  content = content.replace(oldPedidosHeader, newPedidosHeader);
}

// 9. Render <PDVModal /> at bottom
if (!content.includes('<PDVModal')) {
  content = content.replace(
    '    </>',
    `      <PDVModal
        isOpen={showPDVModal}
        onClose={() => setShowPDVModal(false)}
        activeSessionId={dashboardData?.activeSessionId}
        onOrderCreated={() => {
          fetchDashboardData();
          setRefreshCaixaSignal(prev => prev + 1);
        }}
      />
    </>`
  );
  console.log('PDVModal rendered at root bottom!');
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
console.log('Full AdminDashboard restoration complete!');
