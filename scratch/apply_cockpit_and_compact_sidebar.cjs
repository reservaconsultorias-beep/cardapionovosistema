const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../src/pages/AdminDashboard.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Add overview states if missing
if (!code.includes('const [overviewViewMode, setOverviewViewMode]')) {
  const targetStateAnchor = "  const [adminLogoUrl, setAdminLogoUrl] = useState('');";
  const replacementState = `  const [adminLogoUrl, setAdminLogoUrl] = useState('');
  const [overviewViewMode, setOverviewViewMode] = useState<'cockpit' | 'grid'>('cockpit');
  const [overviewChartTab, setOverviewChartTab] = useState<'faturamento' | 'categorias' | 'produtos' | 'pagamentos'>('faturamento');
  const [isOverviewChartDropdownOpen, setIsOverviewChartDropdownOpen] = useState(false);
  const overviewChartDropdownRef = useRef<HTMLDivElement>(null);`;
  
  if (code.includes(targetStateAnchor)) {
    code = code.replace(targetStateAnchor, replacementState);
    console.log('1. States adicionados com sucesso!');
  } else {
    console.error('ERRO: targetStateAnchor nao encontrado');
  }
}

// 1.2 Add click outside listener for overviewChartDropdownRef if missing
if (!code.includes("overviewChartDropdownRef.current && !overviewChartDropdownRef.current.contains")) {
  const anchorEffect = "  useEffect(() => {\n    fetchDashboardData();\n  }, [dateFilter]);";
  const replacementEffect = `  useEffect(() => {
    fetchDashboardData();
  }, [dateFilter]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overviewChartDropdownRef.current && !overviewChartDropdownRef.current.contains(e.target as Node)) {
        setIsOverviewChartDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);`;

  if (code.includes(anchorEffect)) {
    code = code.replace(anchorEffect, replacementEffect);
    console.log('1.2 Click outside adicionado com sucesso!');
  } else {
    // Try with CRLF
    const anchorEffectCRLF = "  useEffect(() => {\r\n    fetchDashboardData();\r\n  }, [dateFilter]);";
    if (code.includes(anchorEffectCRLF)) {
      code = code.replace(anchorEffectCRLF, replacementEffect);
      console.log('1.2 Click outside adicionado com sucesso (CRLF)!');
    }
  }
}

// 2. Expandir date filter check in fetchDashboardData
const oldFilterBlock = `      if (filter === 'hoje') {
        const todayStr = now.toISOString().split('T')[0];
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.toISOString().split('T')[0] === todayStr;
        });
      } else if (filter === '7dias') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d >= sevenDaysAgo;
        });
      } else if (filter === 'mes') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
      } else if (filter === 'customizado') {
        const startStr = customStartDateRef.current;
        const endStr = customEndDateRef.current;
        if (startStr && endStr) {
          const start = new Date(\`\${startStr}T00:00:00\`);
          const end = new Date(\`\${endStr}T23:59:59\`);
          allOrdersAgg = allDbOrders.filter(o => {
            const d = safeGetTime(o.createdAt);
            if (!d) return false;
            return d >= start && d <= end;
          });
        }
      }`;

const newFilterBlock = `      if (filter === 'hoje') {
        const todayStr = now.toISOString().split('T')[0];
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.toISOString().split('T')[0] === todayStr;
        });
      } else if (filter === 'ontem') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yestStr = yesterday.toISOString().split('T')[0];
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.toISOString().split('T')[0] === yestStr;
        });
      } else if (filter === '7dias') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d >= sevenDaysAgo;
        });
      } else if (filter === '30dias') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d >= thirtyDaysAgo;
        });
      } else if (filter === 'mes' || filter === 'este_mes') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
      } else if (filter === 'mes_passado') {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });
      } else if (filter === 'todos') {
        allOrdersAgg = allDbOrders;
      } else if (filter === 'customizado') {
        const startStr = customStartDateRef.current;
        const endStr = customEndDateRef.current;
        if (startStr && endStr) {
          const start = new Date(\`\${startStr}T00:00:00\`);
          const end = new Date(\`\${endStr}T23:59:59\`);
          allOrdersAgg = allDbOrders.filter(o => {
            const d = safeGetTime(o.createdAt);
            if (!d) return false;
            return d >= start && d <= end;
          });
        }
      }`;

const norm = s => s.replace(/\r\n/g, '\n');
if (norm(code).includes(norm(oldFilterBlock))) {
  const isCRLF = code.includes('\r\n');
  const sp = isCRLF ? oldFilterBlock.replace(/\n/g, '\r\n') : oldFilterBlock;
  const rp = isCRLF ? newFilterBlock.replace(/\n/g, '\r\n') : newFilterBlock;
  code = code.replace(sp, rp);
  console.log('2. Filtro expandido com sucesso!');
} else {
  console.log('2. oldFilterBlock nao encontrado diretamente');
}

// 3. Compactar Sidebar Desktop para eliminar o scroll vertical
const oldSidebarNavBlock = `        <div className="p-3 flex-1 space-y-1 font-sans text-sm overflow-y-auto hide-scrollbar">
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
        </div>`;

const newSidebarNavBlock = `        <div className="p-2 flex-1 space-y-0.5 font-sans text-xs overflow-y-auto hide-scrollbar">
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("visao-geral")} 
              className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'visao-geral' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <LayoutDashboard size={15} className={activeTab === 'visao-geral' ? 'text-stone-950' : 'text-stone-400'} />
              Visão Geral
            </button>
          )}
          {hasPermission('ver_pedidos') && (
            <button 
              onClick={() => setActiveTab("pedidos")} 
              className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'pedidos' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <ShoppingBag size={15} className={activeTab === 'pedidos' ? 'text-stone-950' : 'text-stone-400'} />
              Pedidos
            </button>
          )}
          {hasPermission('gerenciar_caixa') && (
            <button 
              onClick={() => setActiveTab("caixa")} 
              className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'caixa' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <CreditCard size={15} className={activeTab === 'caixa' ? 'text-stone-950' : 'text-stone-400'} />
              Caixa
            </button>
          )}
          {hasPermission('gerenciar_caixa') && (
            <button 
              onClick={() => setActiveTab("despesas")} 
              className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'despesas' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <TrendingDown size={15} className={activeTab === 'despesas' ? 'text-stone-950' : 'text-stone-400'} />
              Despesas
            </button>
          )}
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("relatorios")} 
              className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'relatorios' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <BarChart3 size={15} className={activeTab === 'relatorios' ? 'text-stone-950' : 'text-stone-400'} />
              Relatórios
            </button>
          )}
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("funil")} 
              className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'funil' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <Filter size={15} className={activeTab === 'funil' ? 'text-stone-950' : 'text-stone-400'} />
              Funil de Vendas
            </button>
          )}
          {hasPermission('ver_clientes') && (
            <button 
              onClick={() => setActiveTab("clientes")} 
              className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'clientes' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
            >
              <Users size={15} className={activeTab === 'clientes' ? 'text-stone-950' : 'text-stone-400'} />
              Clientes
            </button>
          )}
          
          {(hasPermission('gerenciar_produtos') || hasPermission('gerenciar_categorias')) && (
            <div className="pt-1.5 mt-1.5 border-t border-stone-800/80 space-y-0.5">
              <p className="px-2 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-0.5">Cardápio</p>
              <button 
                onClick={() => setActiveTab("cardapio-digital")} 
                className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'cardapio-digital' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
              >
                <UtensilsCrossed size={15} className={activeTab === 'cardapio-digital' ? 'text-stone-950' : 'text-stone-400'} />
                Cardápio Digital
              </button>
              {hasPermission('gerenciar_produtos') && (
                <button 
                  onClick={() => setActiveTab("gestao-cardapio")} 
                  className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'gestao-cardapio' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
                >
                  <Package size={15} className={activeTab === 'gestao-cardapio' ? 'text-stone-950' : 'text-stone-400'} />
                  Produtos
                </button>
              )}
              {hasPermission('gerenciar_categorias') && (
                <button 
                  onClick={() => setActiveTab("categorias")} 
                  className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'categorias' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
                >
                  <FolderTree size={15} className={activeTab === 'categorias' ? 'text-stone-950' : 'text-stone-400'} />
                  Categorias
                </button>
              )}
              <button 
                onClick={() => setActiveTab("banner-promocional")} 
                className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'banner-promocional' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-300 hover:text-white hover:bg-stone-900/60'}\`}
              >
                <Megaphone size={15} className={activeTab === 'banner-promocional' ? 'text-stone-950' : 'text-stone-400'} />
                Banner Promocional
              </button>
            </div>
          )}

          {(hasPermission('gerenciar_configuracoes') || hasPermission('gerenciar_usuarios')) && (
            <div className="pt-1.5 mt-1.5 border-t border-stone-800/80 space-y-0.5">
              <p className="px-2 text-[9px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-0.5">Sistema</p>
              {hasPermission('gerenciar_configuracoes') && (
                <button 
                  onClick={() => setActiveTab("configuracoes")} 
                  className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'configuracoes' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-400 hover:text-white hover:bg-stone-900'}\`}
                >
                  <Settings size={15} className={activeTab === 'configuracoes' ? 'text-stone-950' : 'text-stone-500'} />
                  Configurações
                </button>
              )}
              {hasPermission('gerenciar_usuarios') && (
                <button 
                  onClick={() => setActiveTab("usuarios")} 
                  className={\`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer \${activeTab === 'usuarios' ? 'bg-[#fdde58] text-stone-950 font-bold shadow-xs border border-[#d8ba39]' : 'text-stone-400 hover:text-white hover:bg-stone-900'}\`}
                >
                  <Shield size={15} className={activeTab === 'usuarios' ? 'text-stone-950' : 'text-stone-500'} />
                  Usuários & Acesso
                </button>
              )}
            </div>
          )}
        </div>`;

if (norm(code).includes(norm(oldSidebarNavBlock))) {
  const isCRLF = code.includes('\r\n');
  const sp = isCRLF ? oldSidebarNavBlock.replace(/\n/g, '\r\n') : oldSidebarNavBlock;
  const rp = isCRLF ? newSidebarNavBlock.replace(/\n/g, '\r\n') : newSidebarNavBlock;
  code = code.replace(sp, rp);
  console.log('3. Sidebar compactada com sucesso (sem scroll vertical)!');
} else {
  console.log('3. oldSidebarNavBlock nao encontrado diretamente');
}

// 4. Header Section com PeriodFilterCompact e botões Primeiro Plano / Grade Completa
const oldHeaderBlock = `          {!['despesas', 'relatorios', 'caixa', 'funil'].includes(activeTab) ? (
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">
                {PAGE_TITLES[activeTab]?.title || 'Painel'}
              </h1>
              <p className="text-xs text-stone-500 font-mono mt-0.5">
                {PAGE_TITLES[activeTab]?.subtitle || ''}
              </p>
            </div>
          ) : <div />}`;

const newHeaderBlock = `          {!['despesas', 'relatorios', 'caixa', 'funil'].includes(activeTab) ? (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-stone-900">
                  {PAGE_TITLES[activeTab]?.title || 'Painel'}
                </h1>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  {PAGE_TITLES[activeTab]?.subtitle || ''}
                </p>
              </div>

              {activeTab === 'visao-geral' && (
                <div className="flex flex-wrap items-center gap-2">
                  <PeriodFilterCompact
                    value={dateFilter as any}
                    startDate={customStartDate}
                    endDate={customEndDate}
                    align="left"
                    onChange={(res) => {
                      setDateFilter(res.period);
                      dateFilterRef.current = res.period;
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
                  />
                  <div className="hidden sm:flex items-center gap-1 bg-stone-100 p-0.5 rounded-xl border border-stone-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setOverviewViewMode('cockpit')}
                      className={\`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer \${overviewViewMode === 'cockpit' ? 'bg-white text-stone-950 shadow-2xs border border-stone-200/80' : 'text-stone-500 hover:text-stone-900'}\`}
                      title="Tudo visível no primeiro plano sem rolagem"
                    >
                      ⚡ Primeiro Plano
                    </button>
                    <button
                      type="button"
                      onClick={() => setOverviewViewMode('grid')}
                      className={\`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer \${overviewViewMode === 'grid' ? 'bg-white text-stone-950 shadow-2xs border border-stone-200/80' : 'text-stone-500 hover:text-stone-900'}\`}
                      title="Grade completa com todos os gráficos abertos"
                    >
                      📊 Grade Completa
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : <div />}`;

if (norm(code).includes(norm(oldHeaderBlock))) {
  const isCRLF = code.includes('\r\n');
  const sp = isCRLF ? oldHeaderBlock.replace(/\n/g, '\r\n') : oldHeaderBlock;
  const rp = isCRLF ? newHeaderBlock.replace(/\n/g, '\r\n') : newHeaderBlock;
  code = code.replace(sp, rp);
  console.log('4. Header atualizado com PeriodFilterCompact e botões Cockpit/Grid!');
} else {
  console.log('4. oldHeaderBlock nao encontrado');
}

// 5. Visão Geral: substitui a aba inteira pelo layout Cockpit (Primeiro plano sem scroll) / Grade
const oldVisaoGeralStart = `        {/* Visão Geral Tab */}
        {activeTab === "visao-geral" && (
          <div className="space-y-6 mt-6">`;

const oldVisaoGeralEnd = `            {/* Additional Modern Neutral Bar Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">`;

// Find where visao-geral starts and where the Pedidos Tab starts
const visaoStartIdx = code.indexOf('{/* Visão Geral Tab */}');
const pedidosStartIdx = code.indexOf('{/* Pedidos Tab */}');

if (visaoStartIdx !== -1 && pedidosStartIdx !== -1) {
  const currentVisaoGeral = code.substring(visaoStartIdx, pedidosStartIdx);

  const newVisaoGeral = `{/* Visão Geral Tab */}
        {activeTab === "visao-geral" && (
          <div className="space-y-3 mt-1 sm:mt-2">
            {Boolean(dashboardData?.pendingOrders && dashboardData.pendingOrders > 0) && (
              <div 
                onClick={() => setActiveTab('pedidos')}
                className="bg-amber-400/15 border border-amber-400/50 hover:border-amber-400 py-1.5 px-3 rounded-lg flex items-center justify-between cursor-pointer transition-all shadow-2xs group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span className="text-xs font-mono font-bold text-amber-950">
                    Atenção: Há {dashboardData.pendingOrders} pedido(s) pendente(s) aguardando preparo ou despacho!
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-900 group-hover:underline flex items-center gap-1 shrink-0">
                  Ver Pedidos →
                </span>
              </div>
            )}

            {/* KPIs Grid - Compacto em 1 linha */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <KpiCard
                title="Faturamento Bruto"
                value={\`€ \${faturamentoBruto.toFixed(2)}\`}
                icon={<DollarSign size={13} strokeWidth={1.5} className="text-emerald-600" />}
                trend={(dashboardData?.revenueChangePercent ?? 0) >= 0 ? \`+\${(dashboardData?.revenueChangePercent ?? 0).toFixed(1)}%\` : \`\${(dashboardData?.revenueChangePercent ?? 0).toFixed(1)}%\`}
                trendUp={(dashboardData?.revenueChangePercent ?? 0) >= 0}
                description="vs período anterior"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.revenue) || []}
                sparklineColor="#15803D"
              />
              <KpiCard
                title="Ticket Médio"
                value={\`€ \${ticketMedio.toFixed(2)}\`}
                icon={<CreditCard size={13} strokeWidth={1.5} className="text-stone-700" />}
                trend="+0%"
                trendUp={true}
                description="Hoje"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#1D4ED8"
              />
              <KpiCard
                title="Total de Pedidos"
                value={totalPedidos.toString()}
                icon={<ShoppingBag size={13} strokeWidth={1.5} className="text-purple-600" />}
                trend={(dashboardData?.ordersChangePercent ?? 0) >= 0 ? \`+\${(dashboardData?.ordersChangePercent ?? 0).toFixed(1)}%\` : \`\${(dashboardData?.ordersChangePercent ?? 0).toFixed(1)}%\`}
                trendUp={(dashboardData?.ordersChangePercent ?? 0) >= 0}
                description="vs período anterior"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#7C3AED"
              />
              <KpiCard
                title="Novos Clientes"
                value={uniqueCustomers.toString()}
                icon={<Users size={13} strokeWidth={1.5} className="text-orange-600" />}
                trend="0%"
                trendUp={true}
                description="No período"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#B45309"
              />
            </div>

            {/* MODO COCKPIT (PRIMEIRO PLANO - SEM SCROLL) */}
            {overviewViewMode === 'cockpit' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
                {/* Coluna Principal: Gráfico Interativo com Dropdown de Métricas */}
                <div className="lg:col-span-2 bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#fdde58]/20 border border-[#fdde58] flex items-center justify-center text-stone-900 shrink-0">
                        <Activity size={14} className="text-stone-900" />
                      </div>
                      <div>
                        <h2 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                          {overviewChartTab === 'faturamento' && 'Evolução do Faturamento'}
                          {overviewChartTab === 'categorias' && 'Vendas por Categoria'}
                          {overviewChartTab === 'produtos' && 'Top 5 Produtos Mais Vendidos'}
                          {overviewChartTab === 'pagamentos' && 'Distribuição por Método de Pagamento'}
                        </h2>
                        <p className="text-[10px] text-stone-500 font-mono">
                          {overviewChartTab === 'faturamento' && 'Volume de receita ao longo da semana'}
                          {overviewChartTab === 'categorias' && 'Distribuição de receita por linha de produtos'}
                          {overviewChartTab === 'produtos' && 'Ranking dos itens com maior saída'}
                          {overviewChartTab === 'pagamentos' && 'Valores totais agrupados por forma de pagamento'}
                        </p>
                      </div>
                    </div>

                    {/* Seletor Compacto do Gráfico */}
                    <div className="relative shrink-0" ref={overviewChartDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsOverviewChartDropdownOpen(!isOverviewChartDropdownOpen)}
                        className="h-8 px-3 bg-white border border-stone-200 hover:border-stone-300 rounded-full text-xs font-semibold text-stone-800 flex items-center gap-2 shadow-2xs transition-all cursor-pointer select-none active:scale-[0.98]"
                      >
                        <span className="text-xs shrink-0">
                          {overviewChartTab === 'faturamento' && '📈'}
                          {overviewChartTab === 'categorias' && '🏷️'}
                          {overviewChartTab === 'produtos' && '🏆'}
                          {overviewChartTab === 'pagamentos' && '💳'}
                        </span>
                        <span className="font-sans text-xs font-bold text-stone-900 truncate">
                          {overviewChartTab === 'faturamento' && 'Evolução do Faturamento'}
                          {overviewChartTab === 'categorias' && 'Vendas por Categoria'}
                          {overviewChartTab === 'produtos' && 'Top 5 Produtos'}
                          {overviewChartTab === 'pagamentos' && 'Formas de Pagamento'}
                        </span>
                        <ChevronDown size={14} className={\`text-stone-400 transition-transform duration-200 shrink-0 \${isOverviewChartDropdownOpen ? 'rotate-180' : ''}\`} />
                      </button>

                      {isOverviewChartDropdownOpen && (
                        <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-stone-200 shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-0.5">
                            Métricas do Gráfico
                          </div>
                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('faturamento'); setIsOverviewChartDropdownOpen(false); }}
                            className={\`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer \${overviewChartTab === 'faturamento' ? 'bg-[#fdde58] text-stone-950 font-bold border border-[#d8ba39]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}\`}
                          >
                            <div className="flex items-center gap-2">
                              <span>📈</span>
                              <span>Evolução do Faturamento</span>
                            </div>
                            {overviewChartTab === 'faturamento' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('categorias'); setIsOverviewChartDropdownOpen(false); }}
                            className={\`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer \${overviewChartTab === 'categorias' ? 'bg-[#fdde58] text-stone-950 font-bold border border-[#d8ba39]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}\`}
                          >
                            <div className="flex items-center gap-2">
                              <span>🏷️</span>
                              <span>Vendas por Categoria</span>
                            </div>
                            {overviewChartTab === 'categorias' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('produtos'); setIsOverviewChartDropdownOpen(false); }}
                            className={\`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer \${overviewChartTab === 'produtos' ? 'bg-[#fdde58] text-stone-950 font-bold border border-[#d8ba39]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}\`}
                          >
                            <div className="flex items-center gap-2">
                              <span>🏆</span>
                              <span>Top 5 Produtos</span>
                            </div>
                            {overviewChartTab === 'produtos' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('pagamentos'); setIsOverviewChartDropdownOpen(false); }}
                            className={\`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer \${overviewChartTab === 'pagamentos' ? 'bg-[#fdde58] text-stone-950 font-bold border border-[#d8ba39]' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}\`}
                          >
                            <div className="flex items-center gap-2">
                              <span>💳</span>
                              <span>Formas de Pagamento</span>
                            </div>
                            {overviewChartTab === 'pagamentos' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Área do Gráfico Calibrada para Primeiro Plano (sem scroll) */}
                  <div className="h-[210px] sm:h-[230px] w-full pt-1">
                    {overviewChartTab === 'faturamento' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={salesData}
                          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f4" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }} 
                            dy={5}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}
                            tickFormatter={(value) => \`€\${value}\`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            labelStyle={{ color: '#a1a1aa', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                            formatter={(value: number) => [\`€ \${Number(value).toFixed(2)}\`, 'Faturamento']}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar
                            dataKey="revenue"
                            fill="#18181b"
                            radius={[4, 4, 0, 0]}
                            barSize={26}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {overviewChartTab === 'categorias' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData?.chartData?.salesByCategory || []} margin={{ top: 8, right: 16, left: -10, bottom: 0 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f1f4" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: '#52525b', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            formatter={(value: any) => [\`€ \${(Number(value) || 0).toFixed(2)}\`, 'Vendas']}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                            {((dashboardData?.chartData?.salesByCategory || []) || []).map((entry: any, index: number) => (
                              <Cell key={\`cell-\${index}\`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {overviewChartTab === 'produtos' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData?.popularItems || []} margin={{ top: 8, right: 16, left: -10, bottom: 0 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f1f4" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: '#52525b', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            formatter={(value: any) => [\`\${Number(value) || 0} unid.\`, 'Quantidade']}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar dataKey="qty" radius={[0, 4, 4, 0]} barSize={18}>
                            {(dashboardData?.popularItems || []).map((entry: any, index: number) => (
                              <Cell key={\`cell-\${index}\`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {overviewChartTab === 'pagamentos' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentMethodsData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f1f4" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: '#52525b', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            formatter={(value: any) => [\`€ \${(Number(value) || 0).toFixed(2)}\`, 'Total']}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                            {paymentMethodsData.map((entry: any, index: number) => (
                              <Cell key={\`cell-\${index}\`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Coluna Lateral: Resumo Compacto de Categorias e Pizzas Favoritas */}
                <div className="space-y-3 flex flex-col justify-between">
                  {/* Top Categorias */}
                  <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-stone-100">
                      <div>
                        <h2 className="text-xs font-bold text-stone-900 leading-tight">Categorias em Destaque</h2>
                        <p className="text-[10px] text-stone-500 font-mono">Mais vendidas</p>
                      </div>
                      <div className="w-5 h-5 rounded-md bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                        <TrendingUp size={12} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {(!(dashboardData?.chartData?.salesByCategory || [])?.length) ? (
                        <div className="text-center text-stone-400 font-mono text-[11px] py-2">Sem dados.</div>
                      ) : (
                        [...(dashboardData?.chartData?.salesByCategory || [])]
                          .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
                          .slice(0, 3)
                          .map((cat: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="font-mono text-stone-600 capitalize truncate max-w-[120px]">{String(cat.name || '').replace('-', ' ')}</span>
                              <span className="font-mono font-bold tabular-nums text-stone-900">€ {(Number(cat.value) || 0).toFixed(2)}</span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Top Pizzas */}
                  <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-stone-100">
                      <div>
                        <h2 className="text-xs font-bold text-stone-900 leading-tight">Pizzas Favoritas</h2>
                        <p className="text-[10px] text-stone-500 font-mono">Mais escolhidas</p>
                      </div>
                      <div className="w-5 h-5 rounded-md bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                        <Pizza size={12} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {(!(dashboardData?.popularPizzas || [])?.length) ? (
                        <div className="text-center text-stone-400 font-mono text-[11px] py-2">Nenhuma pizza ainda.</div>
                      ) : (
                        (dashboardData?.popularPizzas || []).slice(0, 3).map((product: any, index: number) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                              <span className="w-4 h-4 rounded bg-stone-100 flex items-center justify-center text-[9px] font-mono font-bold text-stone-600 shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-stone-900 truncate" title={product.name}>
                                {product.name}
                              </span>
                            </div>
                            <span className="font-mono font-bold tabular-nums text-stone-900 shrink-0">
                              € {(Number(product.revenue) || 0).toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MODO GRADE COMPLETA (TODOS OS GRÁFICOS EXPANDIDOS) */
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Evolução do Faturamento</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Todos os dias da semana</p>
                      </div>
                      <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                        <Activity size={16} className="text-stone-600" />
                      </div>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }} tickFormatter={(value) => \`€\${value}\`} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '12px' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(value: number) => [\`€ \${Number(value).toFixed(2)}\`, 'Faturamento']} cursor={{fill: 'rgba(24, 24, 27, 0.04)'}} />
                          <Bar dataKey="revenue" fill="#18181b" radius={[4, 4, 0, 0]} barSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Categorias em Destaque</h2>
                          <p className="text-[11px] text-stone-500 font-mono">Mais vendidas</p>
                        </div>
                        <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                          <TrendingUp size={16} className="text-stone-600" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(!(dashboardData?.chartData?.salesByCategory || [])?.length) ? (
                          <div className="text-center text-stone-500 font-mono text-xs py-2">Sem dados.</div>
                        ) : (
                          [...(dashboardData?.chartData?.salesByCategory || [])].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 3).map((cat: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span className="text-xs font-mono text-stone-600 capitalize">{String(cat.name || '').replace('-', ' ')}</span>
                              <span className="text-xs font-mono font-bold tabular-nums text-stone-900">€ {(Number(cat.value) || 0).toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Pizzas Favoritas</h2>
                          <p className="text-[11px] text-stone-500 font-mono">Mais escolhidas</p>
                        </div>
                        <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                          <Pizza size={16} className="text-stone-600" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(!(dashboardData?.popularPizzas || [])?.length) ? (
                          <div className="text-center text-stone-500 font-mono text-xs py-2">Nenhuma pizza registrada.</div>
                        ) : (
                          (dashboardData?.popularPizzas || []).slice(0, 3).map((product: any, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2 truncate">
                                <span className="w-5 h-5 rounded bg-stone-100 flex items-center justify-center text-[10px] font-mono font-bold text-stone-600 border border-stone-200 shrink-0">{index + 1}</span>
                                <span className="text-xs font-semibold text-stone-900 truncate">{product.name}</span>
                              </div>
                              <span className="text-xs font-mono font-bold tabular-nums text-stone-900 shrink-0">€ {(Number(product.revenue) || 0).toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Vendas por Categoria</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Distribuição por receita</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData?.chartData?.salesByCategory || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: '#52525b', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(value: any) => [\`€ \${(Number(value) || 0).toFixed(2)}\`, 'Vendas']} cursor={{fill: 'rgba(24, 24, 27, 0.04)'}} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                            {((dashboardData?.chartData?.salesByCategory || []) || []).map((entry: any, index: number) => (
                              <Cell key={\`cell-\${index}\`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Top 5 Produtos</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Por volume de vendas</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData?.popularItems || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: '#52525b', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(value: any) => [\`\${Number(value) || 0} unid.\`, 'Quantidade']} cursor={{fill: 'rgba(24, 24, 27, 0.04)'}} />
                          <Bar dataKey="qty" radius={[0, 4, 4, 0]} barSize={18}>
                            {(dashboardData?.popularItems || []).map((entry: any, index: number) => (
                              <Cell key={\`cell-\${index}\`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Formas de Pagamento</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Distribuição por método</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentMethodsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fontWeight: 600, fill: '#52525b', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }} itemStyle={{ color: '#ffffff', fontWeight: 700 }} formatter={(value: any) => [\`€ \${(Number(value) || 0).toFixed(2)}\`, 'Total']} cursor={{fill: 'rgba(24, 24, 27, 0.04)'}} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                            {paymentMethodsData.map((entry: any, index: number) => (
                              <Cell key={\`cell-\${index}\`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        `;

  code = code.substring(0, visaoStartIdx) + newVisaoGeral + code.substring(pedidosStartIdx);
  console.log('5. Visão Geral substituída pelo layout Cockpit / Grade com sucesso!');
} else {
  console.error('ERRO: visaoStartIdx ou pedidosStartIdx nao encontrado!');
}

// 6. Atualizar KpiCard para a versão compacta (primeiro plano sem scroll)
const oldKpiCardBlock = `function KpiCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  description,
  sparklineData,
  sparklineColor = "#18181B"
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend: string; 
  trendUp: boolean; 
  description: string;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  return (
    <div className="bg-white p-5 rounded-lg border border-stone-200 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-stone-500">{title}</span>
        <div className="p-1.5 bg-stone-50 rounded border border-stone-200 text-stone-600">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-stone-900 tracking-tight">{value}</p>
      </div>
    </div>
  );
}`;

const newKpiCardBlock = `function KpiCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  description,
  sparklineData,
  sparklineColor = "#18181B"
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend: string; 
  trendUp: boolean; 
  description: string;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  return (
    <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-stone-200/90 shadow-2xs hover:border-stone-300 transition-all flex flex-col justify-between">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 truncate mr-1.5">{title}</span>
        <div className="w-5 h-5 rounded-md bg-stone-50 border border-stone-200/80 text-stone-700 flex items-center justify-center shrink-0">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-1 mt-0.5">
        <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-stone-900 tracking-tight leading-none">{value}</p>
        {trend && (
          <span className={\`text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded \${trendUp ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-stone-100 text-stone-600 border border-stone-200'}\`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}`;

if (norm(code).includes(norm(oldKpiCardBlock))) {
  const isCRLF = code.includes('\r\n');
  const sp = isCRLF ? oldKpiCardBlock.replace(/\n/g, '\r\n') : oldKpiCardBlock;
  const rp = isCRLF ? newKpiCardBlock.replace(/\n/g, '\r\n') : newKpiCardBlock;
  code = code.replace(sp, rp);
  console.log('6. KpiCard atualizado para versão compacta com sucesso!');
} else {
  console.log('6. oldKpiCardBlock nao encontrado');
}

// 7. Limpar o PDVModal que estava dentro do dropdown da loja se existir
const accidentalPdvInsideDropdown = `      <PDVModal
        isOpen={showPDVModal}
        onClose={() => setShowPDVModal(false)}
        activeSessionId={dashboardData?.activeSessionId}
        onOrderCreated={() => {
          fetchDashboardData();
          setRefreshCaixaSignal(prev => prev + 1);
        }}
      />`;

if (code.includes(accidentalPdvInsideDropdown)) {
  code = code.replace(accidentalPdvInsideDropdown, '');
  console.log('7. Removido PDVModal duplicado de dentro do dropdown!');
}

// Ensure PDVModal is rendered before closing main/dashboard
if (!code.includes('<PDVModal')) {
  const endAnchor = "      {/* Report Modal */}";
  const pdvModalCode = `      <PDVModal
        isOpen={showPDVModal}
        onClose={() => setShowPDVModal(false)}
        activeSessionId={dashboardData?.activeSessionId}
        onOrderCreated={() => {
          fetchDashboardData();
          setRefreshCaixaSignal(prev => prev + 1);
        }}
      />\n\n      {/* Report Modal */}`;
  if (code.includes(endAnchor)) {
    code = code.replace(endAnchor, pdvModalCode);
    console.log('7. PDVModal posicionado corretamente!');
  }
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Script de atualização concluído com sucesso!');
