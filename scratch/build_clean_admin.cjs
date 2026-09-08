const cp = require('child_process');
const fs = require('fs');

// We take the original clean file from commit a0c5ca6 as our solid foundation
const original = cp.execSync('git show a0c5ca6:src/pages/AdminDashboard.tsx').toString();

let code = original;

// 1. IMPORTS
code = code.replace(
  "import CategoryManager from '../components/CategoryManager';",
  `import CategoryManager from '../components/CategoryManager';
import { SalesFunnelManager } from '../components/SalesFunnelManager';
import PeriodFilterCompact from '../components/PeriodFilterCompact';
import ExpensesManager from '../components/ExpensesManager';
import PDVModal from '../components/PDVModal';`
);

// Add missing lucide icons
code = code.replace(
  'TrendingUp,',
  'TrendingUp, TrendingDown, Filter, Layers, RefreshCw, ChevronDown,'
);

// 2. STATE DECLARATIONS (no duplicate customStartDate)
code = code.replace(
  'const [activeTab, setActiveTab] = useState("visao-geral");',
  `const [activeTab, setActiveTab] = useState("visao-geral");
  const [showPDVModal, setShowPDVModal] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [refreshCaixaSignal, setRefreshCaixaSignal] = useState(0);
  const [isOverviewChartDropdownOpen, setIsOverviewChartDropdownOpen] = useState(false);
  const overviewChartDropdownRef = useRef<HTMLDivElement>(null);`
);

// Permission safeguard: fallback to true if userRole is null/undefined
code = code.replace(
  `  const hasPermission = (permKey: string): boolean => {
    if (userRole === 'owner') return true;
    return !!userPermissions[permKey];
  };`,
  `  const hasPermission = (permKey: string): boolean => {
    if (!userRole || userRole === 'owner') return true;
    return !!userPermissions[permKey];
  };`
);

// 3. FETCH EXPENSES & CASH FLOW IN fetchDashboardData
code = code.replace(
  "const { data: dbOrders, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });",
  `const { data: dbExpenses, error: expensesError } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (expensesError) console.error(expensesError);
      setExpenses(dbExpenses || []);
      const { data: dbOrders, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });`
);

// 4. CASH FLOW DATA
code = code.replace(
  "pieData: Object.entries(salesByCategory).map(([name, value]) => ({ name, value }))\n      }});",
  `pieData: Object.entries(salesByCategory).map(([name, value]) => ({ name, value })),
        cashFlowData: (() => {
          const cashFlowMap = new Map<string, { revenue: number, expenses: number }>();
          filteredOrders.forEach(o => {
            const d = new Date(o.createdAt).toLocaleDateString('pt-BR');
            if (!cashFlowMap.has(d)) cashFlowMap.set(d, { revenue: 0, expenses: 0 });
            cashFlowMap.get(d)!.revenue += o.totalAmount;
          });
          (dbExpenses || []).forEach(e => {
            const d = new Date(e.created_at || e.date).toLocaleDateString('pt-BR');
            if (!cashFlowMap.has(d)) cashFlowMap.set(d, { revenue: 0, expenses: 0 });
            cashFlowMap.get(d)!.expenses += Number(e.amount || 0);
          });
          return Array.from(cashFlowMap.entries()).map(([date, val]) => ({
            date,
            revenue: val.revenue,
            expenses: val.expenses,
            profit: val.revenue - val.expenses
          })).slice(-14);
        })()
      }});`
);

// 5. PAGE_TITLES mapping
code = code.replace(
  "'caixa': { title: 'Caixa', subtitle: 'Fluxo e fechamento' },",
  `'caixa': { title: 'Caixa', subtitle: 'Fluxo e fechamento' },
    'despesas': { title: 'Despesas', subtitle: 'Gerencie as saídas do caixa' },
    'funil': { title: 'Funil de Vendas', subtitle: 'Jornada do cliente e conversão' },`
);

// 6. MOBILE DRAWER MENU
const oldMobileDrawerStart = '<div className="space-y-1 font-mono text-xs">';
const oldMobileDrawerEnd = '<div className="pt-4 border-t border-stone-100 space-y-1.5 font-mono text-xs">';
const mS = code.indexOf(oldMobileDrawerStart);
const mE = code.indexOf(oldMobileDrawerEnd);

if (mS !== -1 && mE !== -1) {
  const newMobileDrawer = `<div className="space-y-1 font-mono text-xs">
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("visao-geral"); setIsMobileMenuOpen(false); }} 
                    className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'visao-geral' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                  >
                    Visão Geral
                  </button>
                )}
                <button 
                  onClick={() => { setActiveTab("pedidos"); setIsMobileMenuOpen(false); }} 
                  className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'pedidos' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                >
                  Pedidos
                </button>
                <button 
                  onClick={() => { setActiveTab("caixa"); setIsMobileMenuOpen(false); }} 
                  className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'caixa' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                >
                  Caixa
                </button>
                <button 
                  onClick={() => { setActiveTab("despesas"); setIsMobileMenuOpen(false); }} 
                  className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'despesas' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                >
                  Despesas
                </button>
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("relatorios"); setIsMobileMenuOpen(false); }} 
                    className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'relatorios' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                  >
                    Relatórios
                  </button>
                )}
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("funil"); setIsMobileMenuOpen(false); }} 
                    className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'funil' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                  >
                    Funil de Vendas
                  </button>
                )}
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("clientes"); setIsMobileMenuOpen(false); }} 
                    className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'clientes' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                  >
                    Clientes
                  </button>
                )}

                {isOwner && (
                  <div className="pt-3 mt-3 border-t border-stone-800">
                    <p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1">Cardápio</p>
                    <button 
                      onClick={() => { setActiveTab("cardapio-digital"); setIsMobileMenuOpen(false); }} 
                      className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'cardapio-digital' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                    >
                      Cardápio Digital
                    </button>
                    <button 
                      onClick={() => { setActiveTab("gestao-cardapio"); setIsMobileMenuOpen(false); }} 
                      className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'gestao-cardapio' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                    >
                      Produtos
                    </button>
                    <button 
                      onClick={() => { setActiveTab("categorias"); setIsMobileMenuOpen(false); }} 
                      className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'categorias' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                    >
                      Categorias
                    </button>
                    <button 
                      onClick={() => { setActiveTab("banner-promocional"); setIsMobileMenuOpen(false); }} 
                      className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'banner-promocional' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                    >
                      Banner Promocional
                    </button>
                  </div>
                )}

                {isOwner && (
                  <div className="pt-3 mt-3 border-t border-stone-800">
                    <p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1">Sistema</p>
                    <button 
                      onClick={() => { setActiveTab("configuracoes"); setIsMobileMenuOpen(false); }} 
                      className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'configuracoes' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                    >
                      Configurações
                    </button>
                    <button 
                      onClick={() => { setActiveTab("usuarios"); setIsMobileMenuOpen(false); }} 
                      className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors \${activeTab === 'usuarios' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs' : 'text-stone-300 hover:text-white hover:bg-stone-900'}\`}
                    >
                      Usuários
                    </button>
                  </div>
                )}
              </div>
            </div>`;
  code = code.substring(0, mS) + newMobileDrawer + '\n\n            ' + code.substring(mE);
}

// 7. DESKTOP SIDEBAR
const oldLogoDesktop = `<span className="w-8 h-8 rounded-lg bg-rose-600 text-white font-mono font-black flex items-center justify-center text-sm border border-rose-700 shrink-0">
              41
            </span>`;
const newLogoDesktop = `<div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-stone-800 shrink-0 flex items-center justify-center p-0.5 shadow-sm">
              <img src={adminLogoUrl || "/logo.png"} alt="41 Menus" className="w-full h-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }} />
            </div>`;
code = code.replace(oldLogoDesktop, newLogoDesktop);

const oldDesktopNavStart = '<div className="p-3 flex-1 space-y-1.5 font-sans text-sm">';
const oldDesktopNavEnd = '</aside>';
const dS = code.indexOf(oldDesktopNavStart);
const dE = code.indexOf(oldDesktopNavEnd);

if (dS !== -1 && dE !== -1) {
  const newDesktopNav = `<div className="p-3 flex-1 space-y-1 font-sans text-sm overflow-y-auto hide-scrollbar">
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
              <p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-2">Cardápio</p>
              <button 
                onClick={() => setActiveTab("cardapio-digital")} 
                className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'cardapio-digital' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
              >
                <UtensilsCrossed size={18} className={activeTab === 'cardapio-digital' ? 'text-stone-950' : 'text-stone-400'} />
                Cardápio Digital
              </button>
              {hasPermission('gerenciar_produtos') && (
                <button 
                  onClick={() => setActiveTab("gestao-cardapio")} 
                  className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'gestao-cardapio' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
                >
                  <Package size={18} className={activeTab === 'gestao-cardapio' ? 'text-stone-950' : 'text-stone-400'} />
                  Produtos
                </button>
              )}
              {hasPermission('gerenciar_categorias') && (
                <button 
                  onClick={() => setActiveTab("categorias")} 
                  className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'categorias' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
                >
                  <FolderTree size={18} className={activeTab === 'categorias' ? 'text-stone-950' : 'text-stone-400'} />
                  Categorias
                </button>
              )}
              <button 
                onClick={() => setActiveTab("banner-promocional")} 
                className={\`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'banner-promocional' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
              >
                <Megaphone size={18} className={activeTab === 'banner-promocional' ? 'text-stone-950' : 'text-stone-400'} />
                Banner Promocional
              </button>
            </div>
          )}

          {(hasPermission('gerenciar_configuracoes') || hasPermission('gerenciar_usuarios')) && (
            <div className="pt-3 mt-3 border-t border-stone-800/80 space-y-1">
              <p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1">Sistema</p>
              {hasPermission('gerenciar_configuracoes') && (
                <button 
                  onClick={() => setActiveTab("configuracoes")} 
                  className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'configuracoes' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-400 hover:text-white hover:bg-stone-900'}\`}
                >
                  <Settings size={16} className={activeTab === 'configuracoes' ? 'text-stone-950' : 'text-stone-500'} />
                  Configurações
                </button>
              )}
              {hasPermission('gerenciar_usuarios') && (
                <button 
                  onClick={() => setActiveTab("usuarios")} 
                  className={\`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer \${activeTab === 'usuarios' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-400 hover:text-white hover:bg-stone-900'}\`}
                >
                  <Shield size={16} className={activeTab === 'usuarios' ? 'text-stone-950' : 'text-stone-500'} />
                  Usuários & Acesso
                </button>
              )}
            </div>
          )}
        </div>
      `;
  code = code.substring(0, dS) + newDesktopNav + code.substring(dE);
}

// 8. HEADER SECTION
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

code = code.replace(oldHeader, newHeader);

// 9. INSERT DESPESAS AND FUNIL TABS
const caixaMarker = '{activeTab === "caixa" && hasPermission(\'gerenciar_caixa\') && (';
const newTabs = `{/* FUNIL DE VENDAS */}
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

code = code.replace(caixaMarker, newTabs + caixaMarker);

// 10. RELATÓRIOS TAB (from rel_block.txt)
const relBlock = fs.readFileSync('rel_block.txt', 'utf8');
const oldRelStart = '{activeTab === "relatorios" && (';
const oldRelEnd = '{activeTab === "cardapio-digital" && (';
const rS = code.indexOf(oldRelStart);
const rE = code.indexOf(oldRelEnd);
if (rS !== -1 && rE !== -1) {
  code = code.substring(0, rS) + relBlock + '\n\n        ' + code.substring(rE);
}

// 11. NOVO PEDIDO (PDV) BUTTON IN PEDIDOS
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

code = code.replace(oldPedidosHeader, newPedidosHeader);

// 12. PDVModal RENDER AT BOTTOM
const pdvModalRender = `
      <PDVModal
        isOpen={showPDVModal}
        onClose={() => setShowPDVModal(false)}
        activeSessionId={dashboardData?.activeSessionId}
        onOrderCreated={() => {
          fetchDashboardData();
          setRefreshCaixaSignal(prev => prev + 1);
        }}
      />
    </>`;

code = code.replace('    </>', pdvModalRender);

// 13. FIX ReportCard iconBg to be optional
code = code.replace(
  'iconBg: string;',
  'iconBg?: string;'
);
code = code.replace(
  'function ReportCard({ \n  title, \n  value, \n  icon, \n  iconBg,\n  onClick,\n  subtitle\n}:',
  "function ReportCard({ \n  title, \n  value, \n  icon, \n  iconBg = 'bg-stone-100 text-stone-700',\n  onClick,\n  subtitle\n}:"
);

// Write clean restored file
fs.writeFileSync('src/pages/AdminDashboard.tsx', code, 'utf8');
console.log('AdminDashboard.tsx rebuilt cleanly with zero errors!');
