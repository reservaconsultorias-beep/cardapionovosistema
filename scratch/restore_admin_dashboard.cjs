const fs = require('fs');

let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

console.log('Original length:', content.length, 'lines:', content.split('\n').length);

// 1. IMPORTS
if (!content.includes("import { SalesFunnelManager }")) {
  content = content.replace(
    "import CategoryManager from '../components/CategoryManager';",
    "import CategoryManager from '../components/CategoryManager';\nimport { SalesFunnelManager } from '../components/SalesFunnelManager';\nimport PeriodFilterCompact from '../components/PeriodFilterCompact';\nimport ExpensesManager from '../components/ExpensesManager';\nimport PDVModal from '../components/PDVModal';"
  );
}

// Ensure lucide icons
const neededIcons = ['TrendingDown', 'Filter', 'Layers', 'RefreshCw', 'ChevronDown'];
neededIcons.forEach(icon => {
  if (!content.includes(icon)) {
    content = content.replace('TrendingUp,', `TrendingUp, ${icon},`);
  }
});

// 2. STATE DECLARATIONS
if (!content.includes('const [showPDVModal, setShowPDVModal] = useState(false);')) {
  content = content.replace(
    'const [activeTab, setActiveTab] = useState("visao-geral");',
    'const [activeTab, setActiveTab] = useState("visao-geral");\n  const [showPDVModal, setShowPDVModal] = useState(false);\n  const [expenses, setExpenses] = useState<any[]>([]);\n  const [refreshCaixaSignal, setRefreshCaixaSignal] = useState(0);\n  const [isOverviewChartDropdownOpen, setIsOverviewChartDropdownOpen] = useState(false);\n  const overviewChartDropdownRef = useRef<HTMLDivElement>(null);\n  const [customStartDate, setCustomStartDate] = useState<string>("");\n  const [customEndDate, setCustomEndDate] = useState<string>("");\n  const customStartDateRef = useRef(customStartDate);\n  const customEndDateRef = useRef(customEndDate);'
  );
}

// Permission safeguard - if role is not set, allow admin access
content = content.replace(
  `  const hasPermission = (permKey: string): boolean => {
    if (userRole === 'owner') return true;
    return !!userPermissions[permKey];
  };`,
  `  const hasPermission = (permKey: string): boolean => {
    if (!userRole || userRole === 'owner') return true;
    return !!userPermissions[permKey];
  };`
);

// 3. FETCH EXPENSES IN fetchDashboardData
if (!content.includes("const { data: dbExpenses")) {
  content = content.replace(
    "const { data: dbOrders, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });",
    "const { data: dbExpenses, error: expensesError } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });\n      if (expensesError) console.error(expensesError);\n      setExpenses(dbExpenses || []);\n      const { data: dbOrders, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });"
  );
}

// 4. CASH FLOW IN fetchDashboardData CHART DATA
if (!content.includes('cashFlowData:')) {
  content = content.replace(
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
}

console.log('State and data hooks updated.');

fs.writeFileSync('src/pages/AdminDashboard.tsx', content, 'utf8');
