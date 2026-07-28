import React, { useState, useEffect, useRef } from "react";
import {
  X, TrendingUp, Key,
  DollarSign,
  ShoppingBag,
  Users,
  Pizza,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Lock,
  Printer,
  Menu,
  LogOut,
  LayoutDashboard,
  FolderTree,
  Package,
  UtensilsCrossed,
  Settings,
  BarChart3,
  Edit3,
  Plus,
  Trash2,
  Tag,
  AlertCircle,
  FileText,
  Check,
  Search
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { ALL_MENU_ITEMS, MenuItem } from "../data/menu";
import { useMenu } from "../hooks/useMenu";
import { supabase } from '../lib/supabase';
import MenuManager from '../components/MenuManager';
import CategoryManager from '../components/CategoryManager';
import SettingsManager from '../components/SettingsManager';
import CustomersManager from '../components/CustomersManager';
import CaixaManager from '../components/CaixaManager';



const CHART_COLORS = ["#334155", "#475569", "#64748b", "#78716c", "#94a3b8", "#a1a1aa"];


const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playChime = (time: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'triangle'; // Softer, more bell-like
      osc.frequency.setValueAtTime(freq, time);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.6, time + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    const t = ctx.currentTime;
    // Turu-turu! (Sequence of notes)
    playChime(t, 1318.51, 0.15); // E6
    playChime(t + 0.15, 1046.50, 0.2); // C6
    
    playChime(t + 0.4, 1318.51, 0.15); // E6
    playChime(t + 0.55, 1046.50, 0.4); // C6
  } catch (e) {
    console.log("Audio play failed", e);
  }
};

export default function AdminDashboard() {
  const { menuItems, categories: dbCategories, loading: menuLoading, usingFallback } = useMenu();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [manualClosed, setManualClosed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const isOwner = userRole === 'owner';

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [reportModal, setReportModal] = useState<{isOpen: boolean, type: string, title: string}>({isOpen: false, type: '', title: ''});
  const [pausedItems, setPausedItems] = useState<string[]>([]);
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem("autoPrint") === "true");
  const autoPrintRef = useRef(autoPrint);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("soundEnabled") !== "false");
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem("soundEnabled", soundEnabled ? "true" : "false");
  }, [soundEnabled]);

  const toggleSound = () => setSoundEnabled(prev => !prev);
  const [lastSeenOrderId, setLastSeenOrderId] = useState<number | null>(null);
  const lastSeenOrderIdRef = useRef(lastSeenOrderId);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  const handleSaveOrderEdit = async (updatedOrder: any) => {
    try {
      const { error } = await supabase.from('orders').update({
        customer_name: updatedOrder.customer_name,
        customer_phone: updatedOrder.customer_phone,
        order_type: updatedOrder.order_type,
        payment_method: updatedOrder.payment_method,
        items: updatedOrder.items,
        discount_amount: updatedOrder.discount_amount,
        additional_amount: updatedOrder.additional_amount,
        total_amount: updatedOrder.total_amount,
        edit_reason: updatedOrder.edit_reason,
        is_edited: true,
        updated_at: new Date().toISOString()
      }).eq('id', updatedOrder.id);

      if (error) throw error;
      setEditingOrder(null);
      fetchDashboardData(true);
      alert(`Pedido #${updatedOrder.id} atualizado com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao atualizar pedido:', err);
      alert('Erro ao atualizar pedido: ' + err.message);
    }
  };

  const fetchDashboardData = async (isBackground = false) => {
    try {
      const filter = dateFilterRef.current || 'hoje';
      const { data: dbOrders, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const allDbOrders = (dbOrders || []).map(o => ({
        id: o.id,
        customerName: o.customer_name || 'Cliente Sem Nome',
        orderType: o.order_type || 'balcao',
        paymentMethod: o.payment_method || 'Outros',
        status: o.status || 'Pendente',
        totalAmount: Number(o.total_amount) || 0,
        items: o.items,
        createdAt: o.created_at
      }));
      setAllOrders(allDbOrders);

      const now = new Date();
      let allOrdersAgg = allDbOrders;
      
      const safeGetTime = (dStr: any) => {
        if (!dStr) return null;
        try {
          const d = new Date(dStr);
          return isNaN(d.getTime()) ? null : d;
        } catch(e) {
          return null;
        }
      };

      if (filter === 'hoje') {
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
      }

      let faturamentoBruto = 0;
      let totalPedidos = allOrdersAgg.length;
      let faturamentoNumerario = 0;
      let faturamentoMBWay = 0;
      const paymentMethodCounts: Record<string, number> = {};
      
      const itemCounts: Record<string, {qty: number, revenue: number}> = {};
      const categoryCounts: Record<string, {qty: number, revenue: number}> = {};
      const pizzaCounts: Record<string, {qty: number, revenue: number}> = {};
      
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const daysCounts: Record<string, {orders: number, revenue: number}> = {};
      dayNames.forEach(d => daysCounts[d] = { orders: 0, revenue: 0 });
      
      allOrdersAgg.forEach(order => {
        const amt = Number(order.totalAmount) || 0;
        faturamentoBruto += amt;
        const pmRaw = order.paymentMethod || 'Outros';
        if (!paymentMethodCounts[pmRaw]) paymentMethodCounts[pmRaw] = 0;
        paymentMethodCounts[pmRaw] += amt;

        const d = safeGetTime(order.createdAt);
        if (d) {
          const dayName = dayNames[d.getDay()];
          if (daysCounts[dayName]) {
            daysCounts[dayName].orders += 1;
            daysCounts[dayName].revenue += amt;
          }
        }

        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            if (!itemCounts[item.name]) {
              itemCounts[item.name] = { qty: 0, revenue: 0 };
            }
            itemCounts[item.name].qty += item.quantity;
            itemCounts[item.name].revenue += item.priceCalculated * item.quantity;

            const cat = item.category || 'outros';
            if (!categoryCounts[cat]) {
              categoryCounts[cat] = { qty: 0, revenue: 0 };
            }
            categoryCounts[cat].qty += item.quantity;
            categoryCounts[cat].revenue += item.priceCalculated * item.quantity;

            if (cat === 'tradicionais' || cat === 'especiais' || cat === 'vegetarianas' || cat === 'gourmet' || cat === 'doces' || cat === 'promocoes') {
              if (!pizzaCounts[item.name]) {
                pizzaCounts[item.name] = { qty: 0, revenue: 0 };
              }
              pizzaCounts[item.name].qty += item.quantity;
              pizzaCounts[item.name].revenue += item.priceCalculated * item.quantity;
            }
          });
        }
      });

      const popularItems = Object.entries(itemCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      const popularPizzas = Object.entries(pizzaCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      const salesByCategory = Object.entries(categoryCounts).map(([name, data]) => ({ name, value: data.revenue }));
      const orderVolumeData = dayNames.map(day => ({
        name: day,
        orders: daysCounts[day].orders,
        revenue: daysCounts[day].revenue
      }));

      
      const uniqueCustomers = new Set(allOrdersAgg.map(o => o.customerName)).size;
      const ticketMedio = totalPedidos > 0 ? (faturamentoBruto / totalPedidos) : 0;
      
      const paymentMethodsData = Object.entries(paymentMethodCounts).map(([name, value]) => ({ name, value }));

      const pendingOrders = allOrdersAgg.filter(o => o.status === 'Pendente');

      const data = {
        status: "ok",
        totalOrders: totalPedidos,
        totalRevenue: faturamentoBruto,
        ticketMedio,
        uniqueCustomers,
        paymentMethodsData,
        faturamentoNumerario,
        faturamentoMBWay,
        pendingOrders: pendingOrders.length,
        recentOrders: allOrdersAgg.slice(0, 10),
        popularItems,
        popularPizzas,
        chartData: {
          salesByCategory,
          orderVolumeData
        }
      };

      setDashboardData(data);
      if (data.recentOrders && data.recentOrders.length > 0) {
        const latestOrder = data.recentOrders[0];
        
        if (lastSeenOrderIdRef.current !== null && latestOrder.id > lastSeenOrderIdRef.current) {
          if (soundEnabledRef.current) {
            playNotificationSound();
          }
          if (autoPrintRef.current) {
            handlePrintOrder(latestOrder);
          }
        }
        if (lastSeenOrderIdRef.current === null || latestOrder.id > lastSeenOrderIdRef.current) {
          setLastSeenOrderId(latestOrder.id);
          lastSeenOrderIdRef.current = latestOrder.id;
        }
      }
      
      const { data: dbPaused, error: pausedError } = await supabase.from('paused_items').select('id');
      if (pausedError) throw pausedError;
      if (dbPaused) {
        setPausedItems(dbPaused.map(pi => pi.id));
      }

    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };


  const toggleAutoPrint = () => {
    const newVal = !autoPrint;
    setAutoPrint(newVal);
    autoPrintRef.current = newVal;
    localStorage.setItem("autoPrint", String(newVal));
  };

  const handlePrintOrder = async (order: any) => {
    setPrintOrder(order);
    let delay = 200;
    try {
      const { data } = await supabase.from('settings').select('value').eq('key', 'print_delay_ms').maybeSingle();
      if (data?.value) delay = Number(data.value);
    } catch (e) {
      console.warn('Não foi possível carregar o atraso de impressão, usando padrão.', e);
    }
    setTimeout(() => {
      window.print();
    }, delay);
  };

  const [activeTab, setActiveTab] = useState("visao-geral");
  const [dateFilter, setDateFilter] = useState("hoje");
  const dateFilterRef = useRef(dateFilter);
  useEffect(() => {
    dateFilterRef.current = dateFilter;
  }, [dateFilter]);

  
  
  useEffect(() => {
    const fetchRole = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      setUserRole(data?.role || null);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        fetchRole(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        fetchRole(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const restrictedTabs = ['visao-geral', 'relatorios', 'gestao-cardapio', 'categorias', 'configuracoes', 'clientes'];
    if (userRole && userRole !== 'owner' && restrictedTabs.includes(activeTab)) {
      setActiveTab('pedidos');
    }
  }, [userRole, activeTab]);

  useEffect(() => {
    const loadStoreStatus = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'manual_store_closed').maybeSingle();
      setManualClosed(data?.value === true);
    };
    loadStoreStatus();
  }, []);

  const toggleStoreClosed = async () => {
    const newValue = !manualClosed;
    setManualClosed(newValue);
    await supabase.from('settings').upsert({ key: 'manual_store_closed', value: newValue, updated_at: new Date().toISOString() });
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchDashboardData();
  }, [isAuthenticated, dateFilter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordChangeMessage("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordChangeMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordChangeMessage("Senha alterada com sucesso!");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setConfirmPassword("");
        setPasswordChangeMessage("");
      }, 2000);
    } catch (err: any) {
      setPasswordChangeMessage("Erro ao alterar a senha: " + err.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      let email = username;
      if (!email.includes('@')) {
        email = email + '@41menus.com';
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;
      // isAuthenticated, userRole e isLoading são atualizados automaticamente
      // pelo listener onAuthStateChange configurado acima.
    } catch (err) {
      console.error(err);
      setLoginError("Credenciais inválidas ou erro de conexão");
      setIsLoading(false);
    }
  };

  const togglePauseCategory = async (categoryGroup: string[], isPaused: boolean) => {
    try {
      const itemsInCategory = menuItems.filter(item => categoryGroup.includes(item.category));
      const itemIds = itemsInCategory.map(i => i.id);
            
      if (!isPaused) {
        const toInsert = itemIds.map(id => ({ id, paused_at: new Date().toISOString() }));
        const { error } = await supabase.from('paused_items').upsert(toInsert, { onConflict: 'id' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('paused_items').delete().in('id', itemIds);
        if (error) throw error;
      }
      fetchDashboardData(true);
    } catch (err: any) {
      console.error("Failed to toggle category pause status", err);
      alert("Erro ao pausar categoria: " + err.message);
    }
  };

  const togglePauseItem = async (itemId: string) => {
    try {
      const isPaused = pausedItems.includes(itemId);
      if (isPaused) {
        const { error } = await supabase.from('paused_items').delete().eq('id', itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('paused_items').upsert({ id: itemId }, { onConflict: 'id' });
        if (error) throw error;
      }
      fetchDashboardData(true);
    } catch (err: any) {
      console.error("Failed to toggle item pause status", err);
      alert("Erro ao pausar item: " + err.message);
    }
  };


  const handleExportCSV = () => {
    if (!allOrders || allOrders.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }
    const orders = allOrders;
    
    const headers = ['ID', 'Data', 'Cliente', 'Telefone', 'Tipo', 'Pagamento', 'Total', 'Status'];
    const rows = orders.map((o: any) => [
      o.id,
      new Date(o.createdAt).toLocaleString('pt-PT').replace(/,/g, ''),
      `"${o.customerName || ''}"`,
      o.customerPhone || '',
      o.orderType,
      o.paymentMethod,
      o.totalAmount.toFixed(2),
      o.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(',') + '\n' 
      + rows.map(e => e.join(',')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_vendas_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDashboardData(null);
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      fetchDashboardData(true);
    } catch (err) {
      console.error("Failed to update status", err);
      console.error("Failed to update status", err);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
              <Lock className="text-gray-400" size={24} />
            </div>
          </div>
          <h1 className="text-2xl font-black text-center text-gray-900 mb-2">Acesso Restrito</h1>
          <p className="text-center text-gray-500 mb-8 text-sm">Insira suas credenciais para acessar o painel.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8b0000] focus:border-transparent outline-none transition-all"
                placeholder="Ex: admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8b0000] focus:border-transparent outline-none transition-all"
                placeholder="Ex: admin"
                required
              />
            </div>
            
            <p className="text-xs text-gray-400 text-center">Credenciais padrão: admin / admin</p>
            
            {loginError && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{loginError}</p>}
            
            <button
              type="submit"
              className="w-full bg-[#8b0000] text-white font-bold py-3 rounded-xl hover:bg-[#660000] transition-colors mt-2"
            >
              Entrar no Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

    const categoriesUI = [
    {
      id: "promocoes",
      label: "PROMOÇÕES DO DIA 📢",
      group: ["promocoes"],
    },
    {
      id: "tradicionais",
      label: "TRADICIONAIS 🍕",
      group: ["tradicionais"],
    },
    {
      id: "especiais",
      label: "ESPECIAIS ⭐",
      group: ["especiais"],
    },
    {
      id: "gourmet",
      label: "GOURMET 👨‍🍳",
      group: ["gourmet"],
    },
    {
      id: "vegetarianas",
      label: "VEGETARIANA 🥗",
      group: ["vegetarianas"],
    },
    {
      id: "doces",
      label: "DOCES 🍫",
      group: ["doces"],
    },
    {
      id: "esfihas",
      label: "ESFIHAS 🧆",
      group: [
        "esfihas-salgadas-tradicionais",
        "esfihas-salgadas-especiais",
        "esfihas-doces",
      ],
    },
    {
      id: "bebidas",
      label: "BEBIDAS 🥤",
      group: ["bebidas"],
    },
    {
      id: "bordas",
      label: "BORDAS 🧀",
      group: ["bordas"],
    }
  ];

    const currentCategoriesUI = dbCategories && dbCategories.length > 0 && !usingFallback 
    ? dbCategories.map(cat => ({
       id: cat.id,
       label: cat.name.toUpperCase(),
       sub: "",
       group: [cat.id]
    }))
    : categoriesUI;
  const itemsByCategory: Record<string, any[]> = {};
  currentCategoriesUI.forEach(cat => {
    itemsByCategory[cat.id] = menuItems.filter(item => cat.group.includes(item.category));
  });

  const { totalRevenue: faturamentoBruto = 0, totalOrders: totalPedidos = 0, ticketMedio = 0, uniqueCustomers = 0, paymentMethodsData = [], chartData = {} } = dashboardData || {};
  const salesData = chartData.orderVolumeData || [];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40 md:hidden w-full no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Abrir Menu Admin"
          >
            <Menu size={22} />
          </button>
          <div>
            <h2 className="text-lg font-black text-[#ea1d2c] tracking-tight leading-none">41 Menu's</h2>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              {activeTab === 'visao-geral' && 'Visão Geral'}
              {activeTab === 'pedidos' && 'Pedidos'}
              {activeTab === 'caixa' && 'Caixa'}
              {activeTab === 'relatorios' && 'Relatórios'}
              {activeTab === 'clientes' && 'Clientes'}
              {activeTab === 'cardapio-digital' && 'Cardápio Digital'}
              {activeTab === 'gestao-cardapio' && 'Produtos'}
              {activeTab === 'categorias' && 'Categorias'}
              {activeTab === 'configuracoes' && 'Configurações'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700">
            <input 
              type="checkbox" 
              className="w-3.5 h-3.5 accent-[#8b0000] rounded cursor-pointer"
              checked={autoPrint}
              onChange={toggleAutoPrint}
            />
            <span className="hidden sm:inline">Auto-Imprimir</span>
            <Printer size={14} className="sm:hidden text-gray-600" />
          </label>
        </div>
      </header>

      {/* Mobile Sidebar Modal Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden no-print">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative bg-white w-72 max-w-[85vw] h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-10">
            <div>
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-black text-[#ea1d2c] tracking-tight">41 Menu's</h2>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Painel de Gestão</p>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-1">
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("visao-geral"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'visao-geral' ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Visão Geral
                  </button>
                )}
                <button 
                  onClick={() => { setActiveTab("pedidos"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'pedidos' ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Pedidos
                </button>
                <button 
                  onClick={() => { setActiveTab("caixa"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'caixa' ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Caixa
                </button>
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("relatorios"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'relatorios' ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Relatórios
                  </button>
                )}
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("clientes"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'clientes' ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    Clientes
                  </button>
                )}

                {isOwner && (
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cardápio</p>
                    <button 
                      onClick={() => { setActiveTab("cardapio-digital"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'cardapio-digital' ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Cardápio Digital
                    </button>
                    <button 
                      onClick={() => { setActiveTab("gestao-cardapio"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'gestao-cardapio' ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Produtos
                    </button>
                    <button 
                      onClick={() => { setActiveTab("categorias"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'categorias' ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Categorias
                    </button>
                  </div>
                )}

                {isOwner && (
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sistema</p>
                    <button 
                      onClick={() => { setActiveTab("configuracoes"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'configuracoes' ? 'bg-[#ea1d2c]/10 text-[#ea1d2c]' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Configurações
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <button 
                onClick={() => { setIsPasswordModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Key size={16} /> Alterar Senha
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} /> Sair do Painel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans no-print">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex-col hidden md:flex sticky top-0 h-screen overflow-y-auto hide-scrollbar">
        {/* Clean Modern Sidebar Header */}
        <div className="p-5 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#000000] text-[#FFDE59] font-black flex items-center justify-center text-sm shadow-sm border border-gray-900 shrink-0">
              41
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black text-gray-900 tracking-tight leading-none">41 Menu's</h2>
              </div>
              <span className="text-[10px] font-extrabold text-[#FD9F23] uppercase tracking-wider block mt-1">Pizzas e Esfihas</span>
            </div>
          </div>
          <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Painel de Gestão</span>
            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Online</span>
          </div>
        </div>

        <div className="p-4 border-b border-gray-100">
          <button
            onClick={toggleStoreClosed}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 shadow-sm ${manualClosed ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200'}`}
          >
            {manualClosed ? '🔴 Loja Fechada (clique p/ abrir)' : '🟢 Loja Aberta (clique p/ fechar)'}
          </button>
        </div>
        
        <div className="p-3 flex-1 space-y-1.5">
          {isOwner && (
            <button 
              onClick={() => setActiveTab("visao-geral")} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${activeTab === 'visao-geral' ? 'bg-[#000000] text-[#FFDE59] shadow-md border-l-4 border-[#FFDE59]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <LayoutDashboard size={18} className={activeTab === 'visao-geral' ? 'text-[#FFDE59]' : 'text-gray-400'} />
              Visão Geral
            </button>
          )}
          <button 
            onClick={() => setActiveTab("pedidos")} 
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${activeTab === 'pedidos' ? 'bg-[#000000] text-[#FFDE59] shadow-md border-l-4 border-[#FFDE59]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <ShoppingBag size={18} className={activeTab === 'pedidos' ? 'text-[#FFDE59]' : 'text-gray-400'} />
            Pedidos
          </button>
          <button 
            onClick={() => setActiveTab("caixa")} 
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${activeTab === 'caixa' ? 'bg-[#000000] text-[#FFDE59] shadow-md border-l-4 border-[#FFDE59]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <CreditCard size={18} className={activeTab === 'caixa' ? 'text-[#FFDE59]' : 'text-gray-400'} />
            Caixa
          </button>
          {isOwner && (
            <button 
              onClick={() => setActiveTab("relatorios")} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${activeTab === 'relatorios' ? 'bg-[#000000] text-[#FFDE59] shadow-md border-l-4 border-[#FFDE59]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <BarChart3 size={18} className={activeTab === 'relatorios' ? 'text-[#FFDE59]' : 'text-gray-400'} />
              Relatórios
            </button>
          )}
          {isOwner && (
            <button 
              onClick={() => setActiveTab("clientes")} 
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${activeTab === 'clientes' ? 'bg-[#000000] text-[#FFDE59] shadow-md border-l-4 border-[#FFDE59]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <Users size={18} className={activeTab === 'clientes' ? 'text-[#FFDE59]' : 'text-gray-400'} />
              Clientes
            </button>
          )}
          
          {isOwner && (
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
              <p className="px-3 text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Cardápio</p>
              <button 
                onClick={() => setActiveTab("cardapio-digital")} 
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${activeTab === 'cardapio-digital' ? 'bg-[#000000] text-[#FFDE59] shadow-md border-l-4 border-[#FFDE59]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <UtensilsCrossed size={18} className={activeTab === 'cardapio-digital' ? 'text-[#FFDE59]' : 'text-gray-400'} />
                Cardápio Digital
              </button>
              <button 
                onClick={() => setActiveTab("gestao-cardapio")} 
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${activeTab === 'gestao-cardapio' ? 'bg-[#000000] text-[#FFDE59] shadow-md border-l-4 border-[#FFDE59]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <Package size={18} className={activeTab === 'gestao-cardapio' ? 'text-[#FFDE59]' : 'text-gray-400'} />
                Produtos
              </button>
              <button 
                onClick={() => setActiveTab("categorias")} 
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${activeTab === 'categorias' ? 'bg-[#000000] text-[#FFDE59] shadow-md border-l-4 border-[#FFDE59]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <FolderTree size={18} className={activeTab === 'categorias' ? 'text-[#FFDE59]' : 'text-gray-400'} />
                Categorias
              </button>
            </div>
          )}
          {isOwner && (
            <div className="pt-3 mt-3 border-t border-gray-100 space-y-1">
              <p className="px-3 text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">Sistema</p>
              <button 
                onClick={() => setActiveTab("configuracoes")} 
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 ${activeTab === 'configuracoes' ? 'bg-[#000000] text-[#FFDE59] shadow-md border-l-4 border-[#FFDE59]' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <Settings size={18} className={activeTab === 'configuracoes' ? 'text-[#FFDE59]' : 'text-gray-400'} />
                Configurações
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Dashboard de Gestão
            </h1>
            <p className="text-gray-500 mt-1">
              Bem-vindo de volta! Aqui está o resumo do seu negócio.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
              Sair
            </button>
          </div>
        </div>

        {autoPrint && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-bold mb-1">Impressão Automática Ativada!</p>
              <p>O sistema verificará novos pedidos a cada 15 segundos e enviará para a impressora. Para que a impressão ocorra de forma invisível (sem abrir janela de confirmação), inicie o Google Chrome com o atalho <b>--kiosk-printing</b> apontando para a sua impressora padrão (térmica 80mm).</p>
            </div>
          </div>
        )}
        
        
        {activeTab === "categorias" && (
          <div className="mt-6">
            <CategoryManager />
          </div>
        )}

        {activeTab === "clientes" && (
          <div className="mt-6">
            <CustomersManager />
          </div>
        )}

        {activeTab === "caixa" && (
          <div className="mt-6">
            <CaixaManager />
          </div>
        )}

        
        {activeTab === "configuracoes" && (
          <div className="mt-6">
            <SettingsManager 
              onTestPrint={handlePrintOrder}
              autoPrint={autoPrint}
              onToggleAutoPrint={toggleAutoPrint}
              onExportCSV={handleExportCSV}
              onChangePassword={() => setIsPasswordModalOpen(true)}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
              onTestSound={playNotificationSound}
            />
          </div>
        )}

        {activeTab === "gestao-cardapio" && (
          <div className="mt-6">
             <MenuManager />
          </div>
        )}
  
        {/* Visão Geral Tab */}
        {activeTab === "visao-geral" && (
          <div className="space-y-6 mt-6">
            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard
                title="Faturamento Bruto"
                value={`€ ${faturamentoBruto.toFixed(2)}`}
                icon={<DollarSign size={24} className="text-emerald-600" />}
                trend="+0%"
                trendUp={true}
                description="Hoje"
              />
              <KpiCard
                title="Ticket Médio"
                value={`€ ${ticketMedio.toFixed(2)}`}
                icon={<CreditCard size={24} className="text-blue-600" />}
                trend="+0%"
                trendUp={true}
                description="Hoje"
              />
              <KpiCard
                title="Total de Pedidos"
                value={totalPedidos.toString()}
                icon={<ShoppingBag size={24} className="text-purple-600" />}
                trend="+0%"
                trendUp={true}
                description="Hoje"
              />
              <KpiCard
                title="Novos Clientes"
                value={uniqueCustomers.toString()}
                icon={<Users size={24} className="text-orange-600" />}
                trend="0%"
                trendUp={true}
                description="No período"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Chart Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Evolução do Faturamento</h2>
                      <p className="text-sm text-gray-500">Últimos 7 dias</p>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Activity size={20} className="text-slate-700" />
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={salesData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#475569" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#475569" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#6b7280', fontSize: 12 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#6b7280', fontSize: 12 }}
                          tickFormatter={(value) => `€${value}`}
                        />
                        <Tooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`€ ${value}`, 'Faturamento']}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#475569"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorFaturamento)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right Column for Products and Categories */}
              <div className="space-y-6">
                {/* Top Categories */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-md hover:shadow-lg transition-shadow flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Categorias em Destaque</h2>
                      <p className="text-sm text-gray-500">Categorias mais vendidas</p>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <TrendingUp size={20} className="text-slate-700" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    {(!(dashboardData?.chartData?.salesByCategory || [])?.length) ? (
                      <div className="text-center text-gray-500 py-4">Sem dados.</div>
                    ) : (
                      (dashboardData?.chartData?.salesByCategory || []).sort((a, b) => b.value - a.value).slice(0, 3).map((cat: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600 capitalize">{cat.name.replace('-', ' ')}</span>
                          <span className="text-sm font-bold text-gray-900">€ {cat.value.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Top Pizzas */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-md hover:shadow-lg transition-shadow flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Pizzas Favoritas</h2>
                      <p className="text-sm text-gray-500">As mais escolhidas</p>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Pizza size={20} className="text-slate-700" />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-start space-y-4">
                    {(!(dashboardData?.popularPizzas || [])?.length) ? (
                      <div className="text-center text-gray-500 py-4">
                        Nenhuma pizza registrada ainda.
                      </div>
                    ) : (
                      (dashboardData?.popularPizzas || []).map((product: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm font-bold text-gray-600 border border-gray-100 flex-shrink-0">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 line-clamp-1 max-w-[150px]" title={product.name}>
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500">{product.qty} unid.</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-slate-800">€ {product.revenue.toFixed(2)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Vendas por Categoria (Pie Chart) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Vendas por Categoria</h2>
                    <p className="text-sm text-gray-500">Distribuição de receita</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardData?.chartData?.salesByCategory || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={2}
                      >
                        {((dashboardData?.chartData?.salesByCategory || []) || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `€ ${value.toFixed(2)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Produtos Mais Vendidos (Bar Chart) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Top 5 Produtos</h2>
                    <p className="text-sm text-gray-500">Por volume de vendas</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData?.popularItems || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f3f4f6" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(value: number) => `${value} unid.`} cursor={{fill: 'transparent'}} />
                      <Bar dataKey="qty" radius={[0, 4, 4, 0]} barSize={32}>
                        {(dashboardData?.popularItems || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Vendas por Pagamento (Pie Chart) */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Formas de Pagamento</h2>
                    <p className="text-sm text-gray-500">Distribuição por método</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodsData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={60}
                        paddingAngle={2}
                      >
                        {paymentMethodsData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `€ ${value.toFixed(2)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Pedidos Tab */}
        {activeTab === "pedidos" && (
          <div className="mt-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Gestor de Pedidos</h2>
                <div className="text-sm text-gray-500">
                  Total: {dashboardData?.recentOrders?.length || 0} pedidos
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-sm text-gray-500 bg-gray-50">
                      <th className="py-4 px-4 font-semibold rounded-tl-lg">Nº / Hora</th>
                      <th className="py-4 px-4 font-semibold">Cliente</th>
                      <th className="py-4 px-4 font-semibold">Tipo</th>
                      <th className="py-4 px-4 font-semibold">Valor</th>
                      <th className="py-4 px-4 font-semibold text-center">Status</th>
                      <th className="py-4 px-4 font-semibold rounded-tr-lg">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {(!dashboardData?.recentOrders || dashboardData.recentOrders.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          Nenhum pedido encontrado.
                        </td>
                      </tr>
                    ) : (
                      dashboardData.recentOrders.map((order: any) => (
                        <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900">#{order.id}</span>
                              {(order.isEdited || order.is_edited) && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 uppercase tracking-wider">EDITADO ✏️</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">{new Date(order.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-900">{order.customerName}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                              {order.orderType}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-bold text-gray-900">€{order.totalAmount.toFixed(2)}</td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap
                              ${order.status === 'Pendente' ? 'bg-gray-100 text-gray-600' :
                                order.status === 'Em Preparo' ? 'bg-orange-100 text-orange-700' :
                                order.status === 'Saiu para Entrega' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white cursor-pointer hover:border-gray-300 outline-none font-medium text-gray-700 shadow-sm"
                              >
                                <option value="Pendente">Pendente</option>
                                <option value="Em Preparo">Em Preparo</option>
                                <option value="Saiu para Entrega">Saiu para Entrega</option>
                                <option value="Finalizado">Finalizado</option>
                              </select>
                              <button
                                onClick={() => setEditingOrder(order)}
                                className="p-2 text-amber-700 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-200 rounded-lg transition-colors shadow-sm cursor-pointer"
                                title="Editar Pedido (Itens, Valores, Desconto, Endereço)"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handlePrintOrder(order)}
                                className="p-2 text-gray-600 hover:text-white bg-gray-100 hover:bg-[#8b0000] rounded-lg transition-colors shadow-sm cursor-pointer"
                                title="Imprimir Talão"
                              >
                                <Printer size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Relatórios Tab */}
        {activeTab === "relatorios" && (
          <div className="mt-6 space-y-8">
            {/* Filtro de Tempo Exclusivo da Aba Relatórios */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Período de Análise</h2>
                <p className="text-xs text-gray-500 mt-0.5">Selecione o filtro de tempo dos relatórios.</p>
              </div>
              <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-200 self-start sm:self-auto">
                <button onClick={() => setDateFilter("hoje")} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${dateFilter === "hoje" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
                  Hoje
                </button>
                <button onClick={() => setDateFilter("7dias")} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${dateFilter === "7dias" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
                  7 Dias
                </button>
                <button onClick={() => setDateFilter("mes")} className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${dateFilter === "mes" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"}`}>
                  Mês
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Relatórios gerais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div onClick={() => setReportModal({isOpen: true, type: 'faturamento', title: 'Faturamento Geral'})} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-gray-300 transition-colors cursor-pointer shadow-sm min-h-[120px]">
                  <span className="text-gray-700 font-medium text-sm mb-1">Faturamento Geral</span>
                  <span className="text-2xl font-black text-gray-900">€ {allOrders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}</span>
                </div>
                <div onClick={() => setReportModal({isOpen: true, type: 'vendas_mes', title: 'Vendas por Mês (Atual)'})} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-gray-300 transition-colors cursor-pointer shadow-sm min-h-[120px]">
                  <span className="text-gray-700 font-medium text-sm mb-1">Vendas por mês</span>
                  <span className="text-2xl font-black text-gray-900">
                    € {allOrders.filter(o => new Date(o.createdAt).getMonth() === new Date().getMonth() && new Date(o.createdAt).getFullYear() === new Date().getFullYear()).reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}
                  </span>
                </div>
                <div onClick={() => setReportModal({isOpen: true, type: 'vendas_7dias', title: 'Vendas Últimos 7 Dias'})} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-gray-300 transition-colors cursor-pointer shadow-sm min-h-[120px]">
                  <span className="text-gray-700 font-medium text-sm mb-1">Vendas últimos 7 dias</span>
                  <span className="text-2xl font-black text-gray-900">
                    € {allOrders.filter(o => new Date(o.createdAt).getTime() >= (new Date().getTime() - 7 * 24 * 60 * 60 * 1000)).reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Relatórios detalhados</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div onClick={() => setReportModal({isOpen: true, type: 'produtos', title: 'Vendas de Produtos'})} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer flex justify-between items-center group">
                  <span className="text-gray-700 font-medium">Vendas de produtos</span>
                  <ArrowDownRight className="text-gray-400 group-hover:text-gray-700 w-4 h-4" />
                </div>
                <div onClick={() => setReportModal({isOpen: true, type: 'complementos', title: 'Vendas de Complementos (Bordas e Extras)'})} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer flex justify-between items-center group">
                  <span className="text-gray-700 font-medium">Vendas de complementos</span>
                  <ArrowDownRight className="text-gray-400 group-hover:text-gray-700 w-4 h-4" />
                </div>
                <div onClick={() => setReportModal({isOpen: true, type: 'pagamentos', title: 'Formas de Pagamento'})} className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer flex justify-between items-center group">
                  <span className="text-gray-700 font-medium">Formas de Pagamento</span>
                  <ArrowDownRight className="text-gray-400 group-hover:text-gray-700 w-4 h-4" />
                </div>
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
                  let filteredOrders = allOrders;
                  if (reportModal.type === 'vendas_mes') {
                    filteredOrders = allOrders.filter(o => new Date(o.createdAt).getMonth() === new Date().getMonth() && new Date(o.createdAt).getFullYear() === new Date().getFullYear());
                  } else if (reportModal.type === 'vendas_7dias') {
                    filteredOrders = allOrders.filter(o => new Date(o.createdAt).getTime() >= (new Date().getTime() - 7 * 24 * 60 * 60 * 1000));
                  }
                  
                  if (reportModal.type === 'produtos' || reportModal.type === 'complementos') {
                    const counts: Record<string, { qty: number, rev: number }> = {};
                    filteredOrders.forEach(o => {
                      const items = Array.isArray(o.items) ? o.items : JSON.parse(o.items || "[]");
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
                     filteredOrders.forEach(o => {
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
                         <span className="font-black text-2xl text-emerald-700">€ {filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}</span>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="py-3 px-4 font-bold text-gray-700">Pedido</th>
                            <th className="py-3 px-4 font-bold text-gray-700">Data</th>
                            <th className="py-3 px-4 font-bold text-gray-700">Cliente</th>
                            <th className="py-3 px-4 font-bold text-gray-700 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map(o => (
                            <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">#{o.id}</td>
                              <td className="py-3 px-4 text-gray-600">{new Date(o.createdAt).toLocaleString('pt-PT')}</td>
                              <td className="py-3 px-4 text-gray-600">{o.customerName}</td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700">€ {o.totalAmount.toFixed(2)}</td>
                            </tr>
                          ))}
                          {filteredOrders.length === 0 && (
                            <tr><td colSpan={4} className="py-6 text-center text-gray-500">Nenhum pedido encontrado</td></tr>
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
        {activeTab === "cardapio-digital" && (
          <div className="mt-6 space-y-8 pb-12">
            {currentCategoriesUI.map(cat => {
              const items = itemsByCategory[cat.id];
              if (!items || items.length === 0) return null;
              
              // Check if all items in this category are paused
              const allPaused = items.every(item => pausedItems.includes(item.id));
              
              return (
                <div key={cat.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{cat.label}</h2>
                      <p className="text-sm text-gray-500">Total: {items.length} itens</p>
                    </div>
                    <button
                      onClick={() => togglePauseCategory(cat.group, allPaused)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${allPaused ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                    >
                      {allPaused ? 'Ativar Categoria' : 'Pausar Categoria'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                      <div key={item.id} className={`p-4 rounded-xl border ${pausedItems.includes(item.id) ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'} shadow-md hover:shadow-lg hover:border-gray-300 transition-all flex gap-4`}>
                        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 relative">
                           {item.imageUrl && (
                             <img src={item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : (item.imageUrl.startsWith('/') ? item.imageUrl : '/' + item.imageUrl)) : ''} alt={item.name} className={`w-full h-full object-cover ${pausedItems.includes(item.id) ? 'grayscale opacity-50' : ''}`} />
                           )}
                           {pausedItems.includes(item.id) && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm text-white text-xs font-bold uppercase tracking-wider">
                               Pausado
                             </div>
                           )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className={`font-bold text-sm ${pausedItems.includes(item.id) ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{item.name}</h3>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.ingredients}</p>
                          </div>
                          <div className="mt-2 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm text-gray-900">
                                {item.priceSingle ? `€ ${item.priceSingle.toFixed(2)}` : (item.priceP ? `Pq: € ${item.priceP.toFixed(2)}` : '')}
                              </span>
                              <button
                                onClick={() => togglePauseItem(item.id)}
                                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${pausedItems.includes(item.id) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                              >
                                {pausedItems.includes(item.id) ? 'Ativar Item' : 'Pausar Item'}
                              </button>
                            </div>
                            
                            {/* Size-specific pausing for pizzas */}
                            {item.priceM !== undefined && item.priceG !== undefined && (
                              <div className="flex gap-2 justify-end border-t border-gray-100 pt-2 mt-1">
                                <button
                                  onClick={() => togglePauseItem(`${item.id}-P`)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${pausedItems.includes(`${item.id}-P`) ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                  {pausedItems.includes(`${item.id}-P`) ? '+ Tamanho P' : '- Tamanho P'}
                                </button>
                                <button
                                  onClick={() => togglePauseItem(`${item.id}-M`)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${pausedItems.includes(`${item.id}-M`) ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                  {pausedItems.includes(`${item.id}-M`) ? '+ Tamanho M' : '- Tamanho M'}
                                </button>
                                <button
                                  onClick={() => togglePauseItem(`${item.id}-G`)}
                                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${pausedItems.includes(`${item.id}-G`) ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                >
                                  {pausedItems.includes(`${item.id}-G`) ? '+ Tamanho G' : '- Tamanho G'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
      </main>
    </div>
    
    
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsPasswordModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Key size={24} className="text-[#8b0000]" />
              Alterar Senha
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8b0000] focus:border-transparent outline-none transition-shadow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#8b0000] focus:border-transparent outline-none transition-shadow"
                  required
                />
              </div>
              
              {passwordChangeMessage && (
                <div className={`p-3 rounded-lg text-sm ${passwordChangeMessage.includes('sucesso') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {passwordChangeMessage}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-3 bg-[#8b0000] text-white font-bold rounded-xl hover:bg-[#6b0000] transition-colors"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        </div>
      )}

      {printOrder && (
      <div className="print-only">
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>41 MENU'S</h2>
          <p style={{ margin: 0, fontSize: '14px' }}>Pizzaria e Restaurante</p>
        </div>
        
        <div style={{ borderBottom: '1px dashed #000', marginBottom: '10px', paddingBottom: '5px', fontSize: '15px' }}>
          <p style={{ margin: 0 }}>Pedido Nº: {printOrder.id}</p>
          <p style={{ margin: 0 }}>Data: {new Date(printOrder.createdAt).toLocaleString('pt-PT')}</p>
          <p style={{ margin: 0 }}>Cliente: {printOrder.customerName}</p>
          <p style={{ margin: 0 }}>Tipo: {printOrder.orderType}</p>
        </div>

        <table style={{ width: '100%', marginBottom: '10px', borderCollapse: 'collapse', fontSize: '15px' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #000' }}>
              <th style={{ textAlign: 'left', paddingBottom: '5px' }}>Qtd</th>
              <th style={{ textAlign: 'left', paddingBottom: '5px' }}>Item</th>
              <th style={{ textAlign: 'right', paddingBottom: '5px' }}>€</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(printOrder.items) ? printOrder.items : (typeof printOrder.items === 'string' ? JSON.parse(printOrder.items) : [])).map((item: any, idx: number) => (
              <React.Fragment key={idx}>
                <tr>
                  <td style={{ verticalAlign: 'top', paddingTop: '5px', fontWeight: 'bold' }}>{item.quantity}x</td>
                  <td style={{ verticalAlign: 'top', paddingTop: '5px' }}>{item.name}</td>
                  <td style={{ verticalAlign: 'top', paddingTop: '5px', textAlign: 'right' }}>{((item.basePrice !== undefined ? item.basePrice : item.priceCalculated) * item.quantity).toFixed(2)}</td>
                </tr>
                {item.extras && item.extras.length > 0 && item.extras.map((extra: any, extraIdx: number) => (
                  <tr key={`${idx}-extra-${extraIdx}`}>
                    <td></td>
                    <td style={{ verticalAlign: 'top', fontSize: '13px', paddingLeft: '5px' }}>+ {extra.name}</td>
                    <td style={{ verticalAlign: 'top', fontSize: '13px', textAlign: 'right' }}>{(extra.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
                {item.extras && item.extras.length > 0 && (
                  <tr key={`${idx}-subtotal`}>
                    <td></td>
                    <td style={{ verticalAlign: 'top', fontSize: '13px', paddingLeft: '5px', fontWeight: 'bold' }}>= Subtotal item</td>
                    <td style={{ verticalAlign: 'top', fontSize: '13px', textAlign: 'right', fontWeight: 'bold' }}>{((item.priceCalculated || 0) * item.quantity).toFixed(2)}</td>
                  </tr>
                )}
                {item.notes && (
                  <tr key={`${idx}-notes`}>
                    <td></td>
                    <td colSpan={2} style={{ verticalAlign: 'top', fontSize: '13px', paddingLeft: '5px', fontStyle: 'italic' }}>Obs: {item.notes}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: '1px dashed #000', paddingTop: '5px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
            <span>Subtotal:</span>
            <span>€ {(Array.isArray(printOrder.items) ? printOrder.items : JSON.parse(printOrder.items)).reduce((sum: number, item: any) => sum + (item.priceCalculated || 0) * item.quantity, 0).toFixed(2)}</span>
          </div>
          {printOrder.orderType === 'entrega' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span>Taxa de Entrega:</span>
              <span>€ {(printOrder.totalAmount - (Array.isArray(printOrder.items) ? printOrder.items : JSON.parse(printOrder.items)).reduce((sum: number, item: any) => sum + (item.priceCalculated || 0) * item.quantity, 0)).toFixed(2)}</span>
            </div>
          )}
          <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <span>TOTAL:</span>
            <span>€ {printOrder.totalAmount.toFixed(2)}</span>
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>Pagamento: {printOrder.paymentMethod}</p>
          
          <div style={{ marginTop: '10px', paddingTop: '5px', borderTop: '1px dotted #000' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', whiteSpace: 'pre-wrap' }}>
              {printOrder.orderType === 'entrega' 
                ? 'Tempo est. de entrega:\n40 a 50 min' 
                : 'Tempo est. de prep.:\n25 a 35 min'}
            </p>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
          <p style={{ margin: 0 }}>Obrigado pela preferência!</p>
          <p style={{ margin: 0 }}>Volte sempre.</p>
        </div>
      </div>
    )}
    {editingOrder && (
      <EditOrderModal
        order={editingOrder}
        menuItems={ALL_MENU_ITEMS}
        onClose={() => setEditingOrder(null)}
        onSave={handleSaveOrderEdit}
      />
    )}
    </>
  );
}

function EditOrderModal({ order, menuItems, onClose, onSave }: { order: any, menuItems: any[], onClose: () => void, onSave: (updatedOrder: any) => Promise<void> }) {
  const [customerName, setCustomerName] = useState(order.customerName || order.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || order.customer_phone || '');
  const [orderType, setOrderType] = useState(order.orderType || order.order_type || 'entrega');
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || order.payment_method || 'Dinheiro');
  const [items, setItems] = useState<any[]>(() => {
    let raw = order.items;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch(e) { raw = []; }
    }
    if (Array.isArray(raw)) return JSON.parse(JSON.stringify(raw));
    return [];
  });

  const [discountAmount, setDiscountAmount] = useState<number>(order.discountAmount || order.discount_amount || 0);
  const [additionalAmount, setAdditionalAmount] = useState<number>(order.additionalAmount || order.additional_amount || 0);
  const [cashProvided, setCashProvided] = useState<number>(order.cashProvided || order.cash_provided || 0);
  const [editReason, setEditReason] = useState(order.editReason || order.edit_reason || '');
  
  const [selectedProductSearch, setSelectedProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSize, setSelectedSize] = useState('priceSingle');
  const [saving, setSaving] = useState(false);

  const subtotal = React.useMemo(() => {
    return items.reduce((acc, item) => {
      const price = Number(item.priceCalculated || item.price || 0);
      const qty = Number(item.quantity || 1);
      return acc + (price * qty);
    }, 0);
  }, [items]);

  const finalTotal = React.useMemo(() => {
    const tot = subtotal + Number(additionalAmount || 0) - Number(discountAmount || 0);
    return Math.max(0, tot);
  }, [subtotal, additionalAmount, discountAmount]);

  const calculatedChange = React.useMemo(() => {
    if (paymentMethod !== 'Dinheiro' || !cashProvided || cashProvided <= 0) return 0;
    return Math.max(0, cashProvided - finalTotal);
  }, [paymentMethod, cashProvided, finalTotal]);

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const menuItem = menuItems.find(m => m.id === selectedProductId);
    if (!menuItem) return;

    let price = menuItem.priceSingle || menuItem.priceP || menuItem.priceM || menuItem.priceG || 0;
    let sizeName = 'Único';
    if (selectedSize === 'priceP' && menuItem.priceP) { price = menuItem.priceP; sizeName = 'Pequena (P)'; }
    else if (selectedSize === 'priceM' && menuItem.priceM) { price = menuItem.priceM; sizeName = 'Média (M)'; }
    else if (selectedSize === 'priceG' && menuItem.priceG) { price = menuItem.priceG; sizeName = 'Grande (G)'; }

    const newItem = {
      menuItem: menuItem,
      name: menuItem.name,
      quantity: 1,
      size: sizeName,
      priceCalculated: price,
    };

    setItems(prev => [...prev, newItem]);
    setSelectedProductId('');
    setSelectedProductSearch('');
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setItems(prev => {
      const updated = [...prev];
      const newQty = (updated[index].quantity || 1) + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updatedPayload = {
      ...order,
      customer_name: customerName,
      customer_phone: customerPhone,
      order_type: orderType,
      payment_method: paymentMethod,
      items: items,
      discount_amount: Number(discountAmount) || 0,
      additional_amount: Number(additionalAmount) || 0,
      total_amount: finalTotal,
      cash_provided: Number(cashProvided) || 0,
      edit_reason: editReason,
      is_edited: true
    };
    await onSave(updatedPayload);
    setSaving(false);
  };

  const filteredMenuItems = React.useMemo(() => {
    if (!selectedProductSearch.trim()) return menuItems.slice(0, 20);
    const term = selectedProductSearch.toLowerCase();
    return menuItems.filter(m => m.name.toLowerCase().includes(term));
  }, [menuItems, selectedProductSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="p-5 bg-gray-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFDE59] text-gray-900 rounded-xl">
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-none text-white">Editar Pedido #{order.id}</h3>
              <p className="text-xs text-gray-400 mt-1 font-medium">Altere produtos, quantidades, taxas e descontos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Customer Info */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Dados do Cliente & Entrega</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Pedido</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
                >
                  <option value="entrega">Entrega (Delivery)</option>
                  <option value="retirada">Retirada (Takeaway)</option>
                  <option value="mesa">Consumo no Local (Mesa)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
                >
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="MBWay">MBWay</option>
                  <option value="Multibanco">Multibanco</option>
                  <option value="Cartão">Cartão na Entrega</option>
                  <option value="Pix">Pix</option>
                </select>
              </div>
            </div>

            {paymentMethod === 'Dinheiro' && (
              <div className="pt-2 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Troco Para (€ / R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashProvided || ''}
                    onChange={(e) => setCashProvided(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm font-semibold outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Ex: 50.00"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-xs font-bold text-gray-500">Troco Recalculado:</span>
                  <span className="text-lg font-black text-emerald-600">€ {calculatedChange.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Items List & Add Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Itens do Pedido ({items.length})</h4>
            </div>

            {/* Current Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
              {items.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400 font-medium">Nenhum item no pedido.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((item, idx) => {
                    const price = Number(item.priceCalculated || item.price || 0);
                    const qty = Number(item.quantity || 1);
                    return (
                      <div key={idx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-gray-900 truncate">{item.name}</div>
                          <div className="text-xs text-gray-500 font-medium">
                            {item.size ? `Tamanho: ${item.size} | ` : ''}€ {price.toFixed(2)} un.
                          </div>
                        </div>

                        {/* Qty Controls */}
                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="w-7 h-7 rounded-md bg-white text-gray-800 font-black flex items-center justify-center shadow-sm hover:bg-gray-200 transition-colors"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-sm font-extrabold text-gray-900">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="w-7 h-7 rounded-md bg-white text-gray-800 font-black flex items-center justify-center shadow-sm hover:bg-gray-200 transition-colors"
                          >
                            +
                          </button>
                        </div>

                        <div className="font-black text-sm text-gray-900 w-20 text-right">
                          € {(price * qty).toFixed(2)}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Remover Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Product Block */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/60 rounded-xl space-y-3">
              <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Plus size={14} className="text-amber-700" /> Adicionar Produto do Cardápio ao Pedido
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 relative">
                  <input
                    type="text"
                    value={selectedProductSearch}
                    onChange={(e) => setSelectedProductSearch(e.target.value)}
                    placeholder="Pesquisar produto pelo nome..."
                    className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {selectedProductSearch && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                      {filteredMenuItems.map(m => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedProductId(m.id);
                            setSelectedProductSearch(m.name);
                          }}
                          className={`p-2 text-xs font-bold cursor-pointer hover:bg-amber-100 flex justify-between ${selectedProductId === m.id ? 'bg-amber-100 text-amber-900' : 'text-gray-800'}`}
                        >
                          <span>{m.name}</span>
                          <span className="text-gray-500 font-semibold">€ {(m.priceSingle || m.priceP || m.priceM || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="flex-1 px-2 py-2 bg-white rounded-lg border border-gray-200 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="priceSingle">Único / Padrão</option>
                    <option value="priceP">Pequena (P)</option>
                    <option value="priceM">Média (M)</option>
                    <option value="priceG">Grande (G)</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProductId}
                    className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    + Incluir
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Financial Adjustments (Desconto & Adicional & Audit Reason) */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Ajustes Financeiros & Auditoria</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-emerald-700 mb-1">
                  Desconto (- € / R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-emerald-300 text-sm font-extrabold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-700 mb-1">
                  Taxa Adicional / Surcharge (+ € / R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={additionalAmount || ''}
                  onChange={(e) => setAdditionalAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-white rounded-lg border border-blue-300 text-sm font-extrabold text-blue-800 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Motivo da Alteração (Histórico / Audit Log)</label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Ex: Cliente adicionou produto pelo WhatsApp / Aplicado cupom cortesia"
                className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          {/* Section 4: Live Total Calculation Bar */}
          <div className="p-4 bg-gray-900 text-white rounded-xl space-y-2">
            <div className="flex justify-between text-xs text-gray-400 font-semibold">
              <span>Subtotal dos Itens:</span>
              <span>€ {subtotal.toFixed(2)}</span>
            </div>
            {additionalAmount > 0 && (
              <div className="flex justify-between text-xs text-blue-400 font-semibold">
                <span>(+) Taxa Adicional / Surcharge:</span>
                <span>+ € {Number(additionalAmount).toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                <span>(-) Desconto Aplicado:</span>
                <span>- € {Number(discountAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
              <span className="text-sm font-black text-white uppercase tracking-wider">TOTAL RECALCULADO:</span>
              <span className="text-2xl font-black text-[#FFDE59]">€ {finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl font-bold text-sm bg-[#ea1d2c] hover:bg-[#c91825] text-white shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {saving ? 'Salvando...' : '💾 Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, trend, trendUp, description }: { title: string, value: string, icon: React.ReactNode, trend: string, trendUp: boolean, description: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-gray-50 group-hover:bg-[#000000] group-hover:text-[#FFDE59] rounded-xl transition-colors duration-200">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-lg ${trendUp ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-red-700 bg-red-50 border border-red-100'}`}>
          {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </div>
      </div>
      <div>
        <h3 className="text-gray-400 text-xs font-black uppercase tracking-wider">{title}</h3>
        <p className="text-3xl font-black text-gray-900 mt-1 tracking-tight group-hover:text-[#ea1d2c] transition-colors">{value}</p>
        <p className="text-xs text-gray-400 mt-2 font-semibold">{description}</p>
      </div>
    </div>
  );
}