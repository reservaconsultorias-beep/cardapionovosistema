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
  Search,
  Shield,
  Megaphone,
  Wallet
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
import UsersManager from '../components/UsersManager';
import BannerManager from '../components/BannerManager';
import { startOfDay, endOfDay } from 'date-fns';



const safeGetDate = (dStr: any): Date | null => {
  if (!dStr) return null;
  try {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

const safeParseItems = (items: any): any[] => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

const CHART_COLORS = ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1"];


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
  const [storeStatus, setStoreStatus] = useState<'open'|'paused'|'closed'>('open');
  const [pausedUntil, setPausedUntil] = useState<string|null>(null);
  const [showStoreMenu, setShowStoreMenu] = useState(false);
  const [adminLogoUrl, setAdminLogoUrl] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
    'visao-geral': { title: 'Visão Geral', subtitle: 'Acompanhe o desempenho do seu negócio em tempo real.' },
    'pedidos': { title: 'Pedidos', subtitle: 'Gerencie e acompanhe os pedidos em tempo real.' },
    'caixa': { title: 'Caixa', subtitle: 'Abertura, fechamento e conferência do turno.' },
    'cardapio-digital': { title: 'Cardápio Digital', subtitle: 'Espelho do que os clientes veem na loja.' },
    'gestao-cardapio': { title: 'Produtos', subtitle: 'Gerencie o cardápio, preços e fotos.' },
    'categorias': { title: 'Categorias', subtitle: 'Organize as categorias do cardápio.' },
    'relatorios': { title: 'Relatórios', subtitle: 'Vendas, ticket médio e produtos mais vendidos.' },
    'clientes': { title: 'Clientes', subtitle: 'Histórico e cadastro de clientes.' },
    'configuracoes': { title: 'Configurações', subtitle: 'Horário, impressão, logo e dados da empresa.' },
    'banner-promocional': { title: 'Banner Promocional', subtitle: 'Configure o pop-up de aviso ou promoção exibido no cardápio.' },
    'usuarios': { title: 'Usuários & Permissões', subtitle: 'Gerencie os acessos da sua equipe.' },
  };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const isOwner = userRole === 'owner';

  const hasPermission = (permKey: string): boolean => {
    if (userRole === 'owner') return true;
    return !!userPermissions[permKey];
  };

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [reportModal, setReportModal] = useState<{isOpen: boolean, type: string, title: string}>({isOpen: false, type: '', title: ''});
  const [pausedItems, setPausedItems] = useState<string[]>([]);
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
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

  const handleDeleteOrder = async (orderId: any) => {
    if (!window.confirm(`Tem certeza de que deseja APAGAR/EXCLUIR permanentemente o Pedido #${orderId}?`)) {
      return;
    }
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      fetchDashboardData(true);
      alert(`Pedido #${orderId} excluído com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao excluir pedido:', err);
      alert('Erro ao excluir pedido: ' + err.message);
    }
  };

  const fetchDashboardData = async (isBackground = false) => {
    try {
      const filter = dateFilterRef.current || 'hoje';
      const { data: activeSessionData } = await supabase.from('cash_sessions').select('id').eq('status', 'aberto').limit(1).maybeSingle();
      const activeSessionId = activeSessionData?.id || null;
      
      const { data: dbOrders, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const allDbOrders = (dbOrders || []).map(o => ({
        id: o.id,
        customerName: o.customer_name || 'Cliente Sem Nome',
        customerPhone: o.customer_phone || '',
        orderType: o.order_type || 'balcao',
        paymentMethod: o.payment_method || 'Outros',
        status: o.status || 'Pendente',
        totalAmount: Number(o.total_amount) || 0,
        deliveryAddress: o.delivery_address || '',
        deliveryZone: o.delivery_zone || '',
        changeFor: o.change_for || '',
        nif: o.nif || '',
        items: o.items,
        isEdited: o.is_edited,
        updatedAt: o.updated_at,
        createdAt: o.created_at,
        cashSessionId: o.cash_session_id
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
      } else if (filter === 'customizado') {
        const startStr = customStartDateRef.current;
        const endStr = customEndDateRef.current;
        if (startStr && endStr) {
          const start = new Date(`${startStr}T00:00:00`);
          const end = new Date(`${endStr}T23:59:59`);
          allOrdersAgg = allDbOrders.filter(o => {
            const d = safeGetTime(o.createdAt);
            if (!d) return false;
            return d >= start && d <= end;
          });
        }
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

      const allDaysCounts: Record<string, {orders: number, revenue: number}> = {};
      dayNames.forEach(d => allDaysCounts[d] = { orders: 0, revenue: 0 });

      allDbOrders.forEach(order => {
        const amt = Number(order.totalAmount) || 0;
        const d = safeGetTime(order.createdAt);
        if (d) {
          const dayName = dayNames[d.getDay()];
          if (allDaysCounts[dayName]) {
            allDaysCounts[dayName].orders += 1;
            allDaysCounts[dayName].revenue += amt;
          }
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

      const allDaysVolumeData = dayNames.map(day => ({
        name: day,
        orders: allDaysCounts[day].orders,
        revenue: allDaysCounts[day].revenue
      }));

      
      const uniqueCustomers = new Set(allOrdersAgg.map(o => o.customerName)).size;
      const ticketMedio = totalPedidos > 0 ? (faturamentoBruto / totalPedidos) : 0;
      
      const paymentMethodsData = Object.entries(paymentMethodCounts).map(([name, value]) => ({ name, value }));

      const pendingOrders = allOrdersAgg.filter(o => o.status === 'Pendente');

      const data = {
        status: "ok",
        activeSessionId,
        totalOrders: totalPedidos,
        totalRevenue: faturamentoBruto,
        ticketMedio,
        uniqueCustomers,
        paymentMethodsData,
        faturamentoNumerario,
        faturamentoMBWay,
        pendingOrders: pendingOrders.length,
        recentOrders: activeSessionId ? allDbOrders.filter(o => o.cashSessionId === activeSessionId) : [],
        popularItems,
        popularPizzas,
        chartData: {
          salesByCategory,
          orderVolumeData,
          allDaysVolumeData
        }
      };

      setDashboardData(data);
      setFilteredOrders(allOrdersAgg);
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
    setShowPrintPreview(true);
  };

  const handleConfirmPrint = () => {
    window.print();
  };

  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
    setPrintOrder(null);
  };

  const [activeTab, setActiveTab] = useState("visao-geral");
  const [dateFilter, setDateFilter] = useState("hoje");
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const dateFilterRef = useRef(dateFilter);
  const customStartDateRef = useRef(customStartDate);
  const customEndDateRef = useRef(customEndDate);
  useEffect(() => {
    dateFilterRef.current = dateFilter;
    customStartDateRef.current = customStartDate;
    customEndDateRef.current = customEndDate;
  }, [dateFilter, customStartDate, customEndDate]);

  
  
  const purgeAllTestData = async (showAlert = false) => {
    try {
      await supabase.from('orders').delete().neq('id', 0);
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cash_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      ['mock_db_orders', 'mock_db_cash_sessions', 'mock_db_customers', 'mock_db_caixa', 'orders', 'cash_sessions', 'customers'].forEach(k => {
        localStorage.removeItem(k);
      });

      setAllOrders([]);
      setDashboardData({
        faturamentoGeral: 0,
        faturamentoMes: 0,
        faturamentoSeteDias: 0,
        pedidosConcluidos: 0,
        ticketMedio: 0,
        cancelamentosCount: 0,
        cancelamentosValor: 0,
        vendasHojeCount: 0,
        vendasHojeTotal: 0,
        produtosPopulares: [],
        vendasComplementos: [],
        vendasFormasPagamento: [],
        pedidosHoje: []
      });

      await fetchDashboardData(true);
      if (showAlert) {
        alert('Todos os dados de vendas, caixa, relatórios e clientes de teste foram zerados com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro ao zerar dados:', err);
      if (showAlert) alert('Erro ao zerar dados: ' + (err.message || String(err)));
    }
  };

  useEffect(() => {
    const fetchRole = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('role, permissions').eq('id', userId).maybeSingle();
      setUserRole(data?.role || null);
      if (data?.permissions && typeof data.permissions === 'object') {
        setUserPermissions(data.permissions);
      } else {
        setUserPermissions({});
      }
    };

    // CÓDIGO DE PURGE AUTOMÁTICO REMOVIDO PARA EVITAR EXCLUSÃO DE DADOS DE PRODUÇÃO

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
        setUserPermissions({});
        setIsLoading(false);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!userRole || userRole === 'owner') return;

    const tabPermissionMap: Record<string, string> = {
      'visao-geral': 'ver_relatorios',
      'pedidos': 'ver_pedidos',
      'caixa': 'gerenciar_caixa',
      'gestao-cardapio': 'gerenciar_produtos',
      'categorias': 'gerenciar_categorias',
      'relatorios': 'ver_relatorios',
      'clientes': 'ver_clientes',
      'configuracoes': 'gerenciar_configuracoes',
      'usuarios': 'gerenciar_usuarios',
    };

    const requiredPerm = tabPermissionMap[activeTab];
    if (requiredPerm && !userPermissions[requiredPerm]) {
      if (userPermissions['ver_pedidos']) setActiveTab('pedidos');
      else if (userPermissions['gerenciar_caixa']) setActiveTab('caixa');
      else if (userPermissions['gerenciar_produtos']) setActiveTab('gestao-cardapio');
      else setActiveTab('pedidos');
    }
  }, [userRole, userPermissions, activeTab]);

  useEffect(() => {
    const loadStoreStatus = async () => {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['manual_store_closed', 'store_status', 'paused_until']);
      const getVal = (k: string) => data?.find(d => d.key === k)?.value;
      
      setManualClosed(getVal('manual_store_closed') === true);
      setStoreStatus(getVal('store_status') || 'open');
      setPausedUntil(getVal('paused_until') || null);
    };
    loadStoreStatus();
  }, []);

  useEffect(() => {
    const loadAdminLogo = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'admin_logo_url').maybeSingle();
      if (data?.value) setAdminLogoUrl(data.value);
    };
    loadAdminLogo();
  }, []);

  const handleStoreAction = async (action: 'open' | 'pause_30m' | 'pause_1h' | 'pause_2h' | 'close') => {
    setShowStoreMenu(false);
    
    if (action === 'open' && !dashboardData?.activeSessionId) {
      alert("⚠️ Você precisa ABRIR O CAIXA primeiro (na aba 'Caixa') antes de abrir a loja para receber pedidos.");
      setActiveTab('caixa');
      return;
    }

    let newStatus = 'open';
    let newPausedUntil = null;
    let newManualClosed = false;

    if (action.startsWith('pause_')) {
      newStatus = 'paused';
      const now = new Date();
      if (action === 'pause_30m') now.setMinutes(now.getMinutes() + 30);
      else if (action === 'pause_1h') now.setHours(now.getHours() + 1);
      else if (action === 'pause_2h') now.setHours(now.getHours() + 2);
      newPausedUntil = now.toISOString();
    } else if (action === 'close') {
      newStatus = 'closed';
      newManualClosed = true;
      setActiveTab('caixa'); // Redireciona para o caixa no fim do dia
    }

    setStoreStatus(newStatus as 'open'|'paused'|'closed');
    setPausedUntil(newPausedUntil);
    setManualClosed(newManualClosed);

    await supabase.from('settings').upsert([
      { key: 'store_status', value: newStatus, updated_at: new Date().toISOString() },
      { key: 'paused_until', value: newPausedUntil || '', updated_at: new Date().toISOString() },
      { key: 'manual_store_closed', value: newManualClosed, updated_at: new Date().toISOString() }
    ], { onConflict: 'key' });
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
      (safeGetDate(o.createdAt) || new Date()).toLocaleString('pt-PT').replace(/,/g, ''),
      `"${o.customerName || ''}"`,
      o.customerPhone || '',
      o.orderType,
      o.paymentMethod,
      (Number(o.totalAmount) || 0).toFixed(2),
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C81E3A] focus:border-transparent outline-none transition-all"
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
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#C81E3A] focus:border-transparent outline-none transition-all"
                placeholder="Ex: admin"
                required
              />
            </div>
            
            <p className="text-xs text-gray-400 text-center">Credenciais padrão: admin / admin</p>
            
            {loginError && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{loginError}</p>}
            
            <button
              type="submit"
              className="w-full bg-[#C81E3A] text-white font-bold py-3 rounded-xl hover:bg-[#A8172F] transition-colors mt-2"
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
      label: "PROMOÇÕES DO DIA",
      group: ["promocoes"],
    },
    {
      id: "tradicionais",
      label: "TRADICIONAIS",
      group: ["tradicionais"],
    },
    {
      id: "especiais",
      label: "ESPECIAIS",
      group: ["especiais"],
    },
    {
      id: "gourmet",
      label: "GOURMET",
      group: ["gourmet"],
    },
    {
      id: "vegetarianas",
      label: "VEGETARIANA",
      group: ["vegetarianas"],
    },
    {
      id: "doces",
      label: "DOCES",
      group: ["doces"],
    },
    {
      id: "esfihas",
      label: "ESFIHAS",
      group: [
        "esfihas-salgadas-tradicionais",
        "esfihas-salgadas-especiais",
        "esfihas-doces",
      ],
    },
    {
      id: "bebidas",
      label: "BEBIDAS",
      group: ["bebidas"],
    },
    {
      id: "bordas",
      label: "BORDAS",
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

    if (!currentCategoriesUI.find(cat => cat.id === 'bordas')) {
      currentCategoriesUI.push({
        id: "bordas",
        label: "BORDAS 🧀",
        group: ["bordas"]
      } as any);
    }
  const itemsByCategory: Record<string, any[]> = {};
  currentCategoriesUI.forEach(cat => {
    itemsByCategory[cat.id] = menuItems.filter(item => cat.group.includes(item.category));
  });

  const { totalRevenue: faturamentoBruto = 0, totalOrders: totalPedidos = 0, ticketMedio = 0, uniqueCustomers = 0, paymentMethodsData = [], chartData = {} } = dashboardData || {};
  const salesData = chartData.allDaysVolumeData || [];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="bg-stone-950 border-b border-stone-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40 md:hidden w-full no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-stone-900 text-stone-300 hover:bg-stone-800 transition-colors border border-stone-800"
            aria-label="Abrir Menu Admin"
          >
            <Menu size={20} />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight leading-none">41 Menu's</h2>
            <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
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
          <label className="flex items-center gap-1.5 cursor-pointer bg-stone-900 px-2.5 py-1.5 rounded-lg border border-stone-700 text-xs font-mono font-semibold text-stone-300">
            <input 
              type="checkbox" 
              className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
              checked={autoPrint}
              onChange={toggleAutoPrint}
            />
            <span className="hidden sm:inline">Auto-Imprimir</span>
            <Printer size={14} className="sm:hidden text-stone-400" />
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
          <div className="relative bg-stone-950 w-72 max-w-[85vw] h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-10">
            <div>
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-stone-800">
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight">41 Menu's</h2>
                  <p className="text-[10px] text-stone-400 uppercase tracking-wider font-mono mt-0.5">Terminal Admin</p>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-stone-500 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1 font-mono text-xs">
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("visao-geral"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === 'visao-geral' ? 'bg-white text-stone-950 font-bold' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                  >
                    Visão Geral
                  </button>
                )}
                <button 
                  onClick={() => { setActiveTab("pedidos"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === 'pedidos' ? 'bg-white text-stone-950 font-bold' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                >
                  Pedidos
                </button>
                <button 
                  onClick={() => { setActiveTab("caixa"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === 'caixa' ? 'bg-white text-stone-950 font-bold' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                >
                  Caixa
                </button>
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("relatorios"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === 'relatorios' ? 'bg-white text-stone-950 font-bold' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                  >
                    Relatórios
                  </button>
                )}
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("clientes"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === 'clientes' ? 'bg-white text-stone-950 font-bold' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                  >
                    Clientes
                  </button>
                )}

                {isOwner && (
                  <div className="pt-3 mt-3 border-t border-stone-800">
                    <p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1">Cardápio</p>
                    <button 
                      onClick={() => { setActiveTab("cardapio-digital"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === 'cardapio-digital' ? 'bg-white text-stone-950 font-bold' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                    >
                      Cardápio Digital
                    </button>
                    <button 
                      onClick={() => { setActiveTab("gestao-cardapio"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === 'gestao-cardapio' ? 'bg-white text-stone-950 font-bold' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                    >
                      Produtos
                    </button>
                    <button 
                      onClick={() => { setActiveTab("categorias"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === 'categorias' ? 'bg-white text-stone-950 font-bold' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                    >
                      Categorias
                    </button>
                  </div>
                )}

                {isOwner && (
                  <div className="pt-3 mt-3 border-t border-stone-800">
                    <p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1">Sistema</p>
                    <button 
                      onClick={() => { setActiveTab("configuracoes"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-semibold transition-colors ${activeTab === 'configuracoes' ? 'bg-white text-stone-950 font-bold' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                    >
                      Configurações
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 space-y-1.5 font-mono text-xs">
              <button 
                onClick={() => { setIsPasswordModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <Key size={15} /> Alterar Senha
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={15} /> Sair do Painel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row font-sans no-print">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-950 text-stone-300 border-r border-stone-800/80 flex-col hidden md:flex sticky top-0 h-screen overflow-y-auto hide-scrollbar">
        {/* Terminal Header */}
        <div className="p-4 border-b border-stone-800/80 bg-stone-950">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-rose-600 text-white font-mono font-black flex items-center justify-center text-sm border border-rose-700 shrink-0">
              41
            </span>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-white tracking-tight leading-none">41 Menu's</h2>
              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider block mt-1">Terminal Admin</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-800 flex items-center justify-between">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">Status do Sistema</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Online</span>
          </div>
        </div>
        <div className="p-3 border-b border-stone-800/80 relative">
          <button
            onClick={() => setShowStoreMenu(!showStoreMenu)}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer border ${
              storeStatus === 'closed' || manualClosed ? 'bg-rose-950/40 text-rose-300 border-rose-900/60 hover:bg-rose-900/40' : 
              storeStatus === 'paused' ? 'bg-amber-950/40 text-amber-300 border-amber-900/60 hover:bg-amber-900/40' :
              'bg-emerald-950/40 text-emerald-300 border-emerald-900/60 hover:bg-emerald-900/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${
              storeStatus === 'closed' || manualClosed ? 'bg-rose-500' : 
              storeStatus === 'paused' ? 'bg-amber-500' : 
              'bg-emerald-400'
            } animate-pulse`} />
            {storeStatus === 'closed' || manualClosed ? 'LOJA FECHADA' : 
             storeStatus === 'paused' ? 'LOJA PAUSADA' : 'LOJA ABERTA'}
          </button>

          {showStoreMenu && (
            <div className="absolute top-full left-3 right-3 mt-1 bg-stone-900 border border-stone-700 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-stone-800 font-sans">
              {(storeStatus === 'closed' || manualClosed || storeStatus === 'paused') ? (
                <button
                  onClick={() => handleStoreAction('open')}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-stone-800 transition-colors"
                >
                  Abrir Loja Agora
                </button>
              ) : (
                <>
                  <div className="p-2">
                    <p className="px-2 py-1 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">Pausa Temporária</p>
                    <button onClick={() => handleStoreAction('pause_30m')} className="w-full text-left px-2 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-white rounded transition-colors">Pausar por 30 min</button>
                    <button onClick={() => handleStoreAction('pause_1h')} className="w-full text-left px-2 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-white rounded transition-colors">Pausar por 1 hora</button>
                    <button onClick={() => handleStoreAction('pause_2h')} className="w-full text-left px-2 py-2 text-sm text-stone-300 hover:bg-stone-800 hover:text-white rounded transition-colors">Pausar por 2 horas</button>
                  </div>
                  <div className="p-2 bg-stone-950/50">
                    <button 
                      onClick={() => handleStoreAction('close')}
                      className="w-full text-left px-2 py-2 text-sm font-bold text-rose-500 hover:bg-rose-950/50 hover:text-rose-400 rounded transition-colors"
                    >
                      Encerrar o Dia (Caixa)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-3 flex-1 space-y-1.5 font-sans text-sm">
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("visao-geral")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'visao-geral' ? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white/60 hover:text-white hover:bg-stone-900/50'}`}
            >
              <LayoutDashboard size={18} className={activeTab === 'visao-geral' ? 'text-white' : 'text-white/50'} />
              Visão Geral
            </button>
          )}
          {hasPermission('ver_pedidos') && (
            <button 
              onClick={() => setActiveTab("pedidos")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'pedidos' ? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white/60 hover:text-white hover:bg-stone-900/50'}`}
            >
              <ShoppingBag size={18} className={activeTab === 'pedidos' ? 'text-white' : 'text-white/50'} />
              Pedidos
            </button>
          )}
          {hasPermission('gerenciar_caixa') && (
            <button 
              onClick={() => setActiveTab("caixa")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'caixa' ? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white/60 hover:text-white hover:bg-stone-900/50'}`}
            >
              <CreditCard size={18} className={activeTab === 'caixa' ? 'text-white' : 'text-white/50'} />
              Caixa
            </button>
          )}
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("relatorios")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'relatorios' ? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white/60 hover:text-white hover:bg-stone-900/50'}`}
            >
              <BarChart3 size={18} className={activeTab === 'relatorios' ? 'text-white' : 'text-white/50'} />
              Relatórios
            </button>
          )}
          {hasPermission('ver_clientes') && (
            <button 
              onClick={() => setActiveTab("clientes")} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'clientes' ? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white/60 hover:text-white hover:bg-stone-900/50'}`}
            >
              <Users size={18} className={activeTab === 'clientes' ? 'text-white' : 'text-white/50'} />
              Clientes
            </button>
          )}
          
          {(hasPermission('gerenciar_produtos') || hasPermission('gerenciar_categorias')) && (
            <div className="pt-4 mt-4 border-t border-stone-800/80 space-y-1.5">
              <p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-2">Cardápio</p>
              <button 
                onClick={() => setActiveTab("cardapio-digital")} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'cardapio-digital' ? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white/60 hover:text-white hover:bg-stone-900/50'}`}
              >
                <UtensilsCrossed size={18} className={activeTab === 'cardapio-digital' ? 'text-white' : 'text-white/50'} />
                Cardápio Digital
              </button>
              {hasPermission('gerenciar_produtos') && (
                <button 
                  onClick={() => setActiveTab("gestao-cardapio")} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'gestao-cardapio' ? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white/60 hover:text-white hover:bg-stone-900/50'}`}
                >
                  <Package size={18} className={activeTab === 'gestao-cardapio' ? 'text-white' : 'text-white/50'} />
                  Produtos
                </button>
              )}
              {hasPermission('gerenciar_categorias') && (
                <button 
                  onClick={() => setActiveTab("categorias")} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'categorias' ? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white/60 hover:text-white hover:bg-stone-900/50'}`}
                >
                  <FolderTree size={18} className={activeTab === 'categorias' ? 'text-white' : 'text-white/50'} />
                  Categorias
                </button>
              )}
              <button 
                onClick={() => setActiveTab("banner-promocional")} 
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'banner-promocional' ? 'bg-rose-600 text-white shadow-xs border border-rose-700' : 'text-white/60 hover:text-white hover:bg-stone-900/50'}`}
              >
                <Megaphone size={18} className={activeTab === 'banner-promocional' ? 'text-white' : 'text-white/50'} />
                Banner Promocional
              </button>
            </div>
          )}
          {(hasPermission('gerenciar_configuracoes') || hasPermission('gerenciar_usuarios')) && (
            <div className="pt-3 mt-3 border-t border-stone-850 space-y-1">
              <p className="px-3 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1">Sistema</p>
              {hasPermission('gerenciar_configuracoes') && (
                <button 
                  onClick={() => setActiveTab("configuracoes")} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'configuracoes' ? 'bg-white text-stone-950 font-bold shadow-xs' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                >
                  <Settings size={16} className={activeTab === 'configuracoes' ? 'text-stone-950' : 'text-stone-500'} />
                  Configurações
                </button>
              )}
              {hasPermission('gerenciar_usuarios') && (
                <button 
                  onClick={() => setActiveTab("usuarios")} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors cursor-pointer ${activeTab === 'usuarios' ? 'bg-white text-stone-950 font-bold shadow-xs' : 'text-stone-400 hover:text-white hover:bg-stone-900'}`}
                >
                  <Shield size={16} className={activeTab === 'usuarios' ? 'text-stone-950' : 'text-stone-500'} />
                  Usuários & Acesso
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-stone-200/80 pb-4">
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
        </div>

        {autoPrint && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Impressão Automática Ativada!</p>
              <p>O sistema verificará novos pedidos a cada 15 segundos e enviará para a impressora. Para que a impressão ocorra de forma invisível (sem abrir janela de confirmação), inicie o Google Chrome com o atalho <b>--kiosk-printing</b> apontando para a sua impressora padrão (térmica 80mm).</p>
            </div>
          </div>
        )}
        
        
        {activeTab === "usuarios" && hasPermission('gerenciar_usuarios') && (
          <div className="mt-6">
            <UsersManager />
          </div>
        )}

        {activeTab === "categorias" && hasPermission('gerenciar_categorias') && (
          <div className="mt-6">
            <CategoryManager />
          </div>
        )}

        {activeTab === "clientes" && hasPermission('ver_clientes') && (
          <div className="mt-6">
            <CustomersManager />
          </div>
        )}

        {activeTab === "caixa" && hasPermission('gerenciar_caixa') && (
          <div className="mt-6">
            <CaixaManager />
          </div>
        )}

        
        {activeTab === "configuracoes" && hasPermission('gerenciar_configuracoes') && (
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

        {activeTab === "gestao-cardapio" && hasPermission('gerenciar_produtos') && (
          <div className="mt-6">
             <MenuManager />
          </div>
        )}

        {activeTab === "banner-promocional" && (
          <div className="mt-6">
            <BannerManager />
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
                trend={(dashboardData?.revenueChangePercent ?? 0) >= 0 ? `+${(dashboardData?.revenueChangePercent ?? 0).toFixed(1)}%` : `${(dashboardData?.revenueChangePercent ?? 0).toFixed(1)}%`}
                trendUp={(dashboardData?.revenueChangePercent ?? 0) >= 0}
                description="vs período anterior"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.revenue) || []}
                sparklineColor="#15803D"
              />
              <KpiCard
                title="Ticket Médio"
                value={`€ ${ticketMedio.toFixed(2)}`}
                icon={<CreditCard size={24} className="text-blue-600" />}
                trend="+0%"
                trendUp={true}
                description="Hoje"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#1D4ED8"
              />
              <KpiCard
                title="Total de Pedidos"
                value={totalPedidos.toString()}
                icon={<ShoppingBag size={24} className="text-purple-600" />}
                trend={(dashboardData?.ordersChangePercent ?? 0) >= 0 ? `+${(dashboardData?.ordersChangePercent ?? 0).toFixed(1)}%` : `${(dashboardData?.ordersChangePercent ?? 0).toFixed(1)}%`}
                trendUp={(dashboardData?.ordersChangePercent ?? 0) >= 0}
                description="vs período anterior"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#7C3AED"
              />
              <KpiCard
                title="Novos Clientes"
                value={uniqueCustomers.toString()}
                icon={<Users size={24} className="text-orange-600" />}
                trend="0%"
                trendUp={true}
                description="No período"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#B45309"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Chart Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-5 rounded-lg border border-stone-200">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900">Evolução do Faturamento</h2>
                      <p className="text-[11px] text-stone-500 font-mono">Todos os dias da semana</p>
                    </div>
                    <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                      <Activity size={16} className="text-stone-600" />
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={salesData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}
                          tickFormatter={(value) => `€${value}`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}
                          itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                          labelStyle={{ color: '#a1a1aa', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                          formatter={(value: number) => [`€ ${Number(value).toFixed(2)}`, 'Faturamento']}
                          cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                        />
                        <Bar
                          dataKey="revenue"
                          fill="#18181b"
                          radius={[4, 4, 0, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right Column for Products and Categories */}
              <div className="space-y-6">
                {/* Top Categories */}
                <div className="bg-white p-5 rounded-lg border border-stone-200 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900">Categorias em Destaque</h2>
                      <p className="text-[11px] text-stone-500 font-mono">Categorias mais vendidas</p>
                    </div>
                    <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                      <TrendingUp size={16} className="text-stone-600" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(!(dashboardData?.chartData?.salesByCategory || [])?.length) ? (
                      <div className="text-center text-stone-500 font-mono text-xs py-4">Sem dados.</div>
                    ) : (
                      [...(dashboardData?.chartData?.salesByCategory || [])]
                        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
                        .slice(0, 3)
                        .map((cat: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-xs font-mono text-stone-600 capitalize">{String(cat.name || '').replace('-', ' ')}</span>
                            <span className="text-xs font-mono font-bold tabular-nums text-stone-900">€ {(Number(cat.value) || 0).toFixed(2)}</span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Top Pizzas */}
                <div className="bg-white p-5 rounded-lg border border-stone-200 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-stone-900">Pizzas Favoritas</h2>
                      <p className="text-[11px] text-stone-500 font-mono">As mais escolhidas</p>
                    </div>
                    <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                      <Pizza size={16} className="text-stone-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-start space-y-3">
                    {(!(dashboardData?.popularPizzas || [])?.length) ? (
                      <div className="text-center text-stone-500 font-mono text-xs py-4">
                        Nenhuma pizza registrada ainda.
                      </div>
                    ) : (
                      (dashboardData?.popularPizzas || []).map((product: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded bg-stone-100 flex items-center justify-center text-[11px] font-mono font-bold text-stone-600 border border-stone-200 flex-shrink-0">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-stone-900 line-clamp-1 max-w-[150px]" title={product.name}>
                                {product.name}
                              </p>
                              <p className="text-[10px] font-mono text-stone-500">{product.qty} unid.</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-mono font-bold tabular-nums text-stone-900">€ {(Number(product.revenue) || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Modern Neutral Bar Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Vendas por Categoria (Horizontal Bar Chart) */}
              <div className="bg-white p-5 rounded-lg border border-stone-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Vendas por Categoria</h2>
                    <p className="text-[11px] text-stone-500 font-mono">Distribuição por receita</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData?.chartData?.salesByCategory || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 600, fill: '#52525b', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}
                        itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                        formatter={(value: any) => [`€ ${(Number(value) || 0).toFixed(2)}`, 'Vendas']}
                        cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                        {((dashboardData?.chartData?.salesByCategory || []) || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Produtos Mais Vendidos (Horizontal Bar Chart) */}
              <div className="bg-white p-5 rounded-lg border border-stone-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Top 5 Produtos</h2>
                    <p className="text-[11px] text-stone-500 font-mono">Por volume de vendas</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData?.popularItems || []} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 600, fill: '#52525b', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}
                        itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                        formatter={(value: any) => [`${Number(value) || 0} unid.`, 'Quantidade']}
                        cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                      />
                      <Bar dataKey="qty" radius={[0, 4, 4, 0]} barSize={22}>
                        {(dashboardData?.popularItems || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Formas de Pagamento (Horizontal Bar Chart) */}
              <div className="bg-white p-5 rounded-lg border border-stone-200">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Formas de Pagamento</h2>
                    <p className="text-[11px] text-stone-500 font-mono">Distribuição por método</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentMethodsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 600, fill: '#52525b', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontFamily: 'ui-monospace, monospace', fontSize: '12px' }}
                        itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                        formatter={(value: any) => [`€ ${(Number(value) || 0).toFixed(2)}`, 'Total']}
                        cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                        {paymentMethodsData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Pedidos Tab */}
        {activeTab === "pedidos" && (
          <div className="mt-6">
            <div className="bg-white p-5 rounded-lg border border-stone-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-stone-900">Gestor de Pedidos</h2>
                <div className="text-[11px] font-mono text-stone-500">
                  Total: <span className="font-bold tabular-nums text-stone-900">{dashboardData?.recentOrders?.length || 0}</span> pedidos
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-stone-200 text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider bg-stone-50">
                      <th className="py-3 px-4 rounded-tl-md">Nº / Hora</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 rounded-tr-md">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    {(!dashboardData?.recentOrders || dashboardData.recentOrders.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          {!dashboardData?.activeSessionId ? (
                            <div className="flex flex-col items-center justify-center text-stone-400">
                              <Wallet size={32} className="mb-2 opacity-50" />
                              <p className="font-bold text-stone-600 text-sm">Caixa Fechado</p>
                              <p>Nenhum pedido em andamento no momento.</p>
                              <p className="text-[10px] mt-1">Abra o caixa na aba "Caixa" para receber pedidos.</p>
                            </div>
                          ) : (
                            <span className="text-stone-500 font-mono text-xs">Nenhum pedido recebido neste turno ainda.</span>
                          )}
                        </td>
                      </tr>
                    ) : (
                      dashboardData.recentOrders.map((order: any) => (
                        <tr key={order.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-900 tabular-nums">#{order.id}</span>
                              {(order.isEdited || order.is_edited) && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">EDITADO</span>
                              )}
                            </div>
                            <div className="text-[10px] text-stone-500 mt-0.5 tabular-nums">{new Date(order.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-stone-900">{order.customerName}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border border-stone-200">
                              {order.orderType}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold tabular-nums text-stone-900">€{order.totalAmount.toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                              className={`px-2 py-1 rounded text-[10px] font-mono font-bold border cursor-pointer outline-none appearance-none hover:opacity-80 transition-opacity
                                ${order.status === 'Pendente' ? 'bg-stone-100 text-stone-600 border-stone-200' :
                                  order.status === 'Em Preparo' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  order.status === 'Saiu para Entrega' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                  order.status === 'Cancelado' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                              style={{ textAlignLast: 'center' }}
                              title="Alterar status manualmente"
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Em Preparo">Em Preparo</option>
                              <option value="Saiu para Entrega">Saiu para Entrega</option>
                              <option value="Finalizado">Finalizado</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {order.status === 'Pendente' && (
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'Em Preparo')}
                                  className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs border border-emerald-700"
                                >
                                  PREPARAR
                                </button>
                              )}
                              {order.status === 'Em Preparo' && (
                                <button
                                  onClick={() => updateOrderStatus(order.id, (order.orderType === 'entrega' || order.orderType === 'Delivery') ? 'Saiu para Entrega' : 'Finalizado')}
                                  className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs border border-blue-700"
                                >
                                  {(order.orderType === 'entrega' || order.orderType === 'Delivery') ? 'DESPACHAR' : 'FINALIZAR'}
                                </button>
                              )}
                              {order.status === 'Saiu para Entrega' && (
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'Finalizado')}
                                  className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs border border-emerald-700"
                                >
                                  FINALIZAR
                                </button>
                              )}
                              {order.status !== 'Finalizado' && order.status !== 'Cancelado' && (
                                <button
                                  onClick={() => {
                                    if(window.confirm('Deseja realmente CANCELAR este pedido?')) {
                                      updateOrderStatus(order.id, 'Cancelado');
                                    }
                                  }}
                                  className="p-1.5 text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 rounded-md transition-colors cursor-pointer"
                                  title="Cancelar Pedido"
                                >
                                  <X size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => setEditingOrder(order)}
                                className="p-1.5 text-amber-700 hover:text-white bg-amber-50 hover:bg-amber-600 border border-amber-200 rounded-md transition-colors cursor-pointer"
                                title="Editar Pedido"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handlePrintOrder(order)}
                                className="p-1.5 text-stone-600 hover:text-white bg-stone-50 hover:bg-stone-900 border border-stone-200 rounded-md transition-colors cursor-pointer"
                                title="Imprimir Talão"
                              >
                                <Printer size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-1.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 rounded-md transition-colors cursor-pointer"
                                title="Excluir Pedido"
                              >
                                <Trash2 size={14} />
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
        {activeTab === "cardapio-digital" && (
          <div className="mt-6 space-y-8 pb-12">
            {/* Categories Bar Sticky */}
            <div className="bg-white border border-gray-200 sticky top-20 z-30 shadow-sm rounded-xl overflow-hidden mb-6">
              <div className="flex overflow-x-auto no-scrollbar gap-2 p-3 items-center">
                {currentCategoriesUI.map((cat) => {
                  return (
                  <a
                    key={cat.id}
                    href={`#admin-cat-${cat.id}`}
                    onClick={(e) => {
                      setActiveCategory(cat.id);
                      const el = document.getElementById(`admin-cat-${cat.id}`);
                      const container = document.querySelector('main');
                      if (el && container) {
                        e.preventDefault();
                        const yOffset = -90; // compensate for sticky header
                        const y = el.getBoundingClientRect().top + container.scrollTop - container.getBoundingClientRect().top + yOffset;
                        container.scrollTo({ top: y, behavior: "smooth" });
                      }
                    }}
                    className={`py-1.5 px-3 md:px-4 rounded-full text-[12px] md:text-[13px] whitespace-nowrap font-bold transition-all duration-150 active:scale-95 active:opacity-70 cursor-pointer border ${
                      activeCategory === cat.id
                        ? "bg-[#8b0000] text-white border-[#8b0000]"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    } ${cat.id === "promocoes" && activeCategory !== cat.id ? "animate-pulse text-[#8b0000] border-[#8b0000]" : ""}`}
                  >
                    {cat.label}
                  </a>
                  );
                })}
              </div>
            </div>

            {currentCategoriesUI.map(cat => {
              const items = itemsByCategory[cat.id];
              if (!items || items.length === 0) return null;
              
              // Check if all items in this category are paused
              const allPaused = items.every(item => pausedItems.includes(item.id));
              
              return (
                <div key={cat.id} id={`admin-cat-${cat.id}`} className="bg-white p-6 rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] hover:shadow-[0_4px_12px_rgba(28,25,23,0.08),0_2px_4px_rgba(28,25,23,0.06)] hover:border-[#D4AF6A]/30 transition-all duration-300">
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
                      <div key={item.id} className={`p-4 rounded-xl border ${pausedItems.includes(item.id) ? 'border-red-200 bg-red-50' : 'border-[#E7E5E1] bg-white'} shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] hover:shadow-[0_4px_12px_rgba(28,25,23,0.08),0_2px_4px_rgba(28,25,23,0.06)] hover:border-[#D4AF6A]/30 transition-all flex gap-4`}>
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
                                  className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${pausedItems.includes(`${item.id}-P`) ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
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
              <Key size={24} className="text-[#C81E3A]" />
              Alterar Senha
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#C81E3A] focus:border-transparent outline-none transition-shadow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#C81E3A] focus:border-transparent outline-none transition-shadow"
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
                className="w-full py-3 bg-[#C81E3A] text-white font-bold rounded-xl hover:bg-[#A8172F] transition-colors"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && printOrder && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', width: '340px' }}>
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111', display: 'flex', alignItems: 'center', gap: '8px' }}><Printer size={18} /> Pré-visualização do Talão</span>
              <button onClick={handleClosePrintPreview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', lineHeight: 1, display: 'flex', alignItems: 'center' }}><X size={20} /></button>
            </div>
            {/* Receipt Content */}
            <div style={{ padding: '16px 20px', flexGrow: 1, overflowY: 'auto' }}>
              <div className="print-receipt-content" style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#000' }}>
                {/* Store Name + Order Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '0.5px' }}>41 Menu's</h2>
                  <span style={{ fontSize: '22px', fontWeight: '800' }}>
                    {printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega' ? 'ENTREGA' : 'RETIRADA'}
                  </span>
                </div>

                {/* Customer Name + Order ID (Black Bar) */}
                <div style={{ backgroundColor: '#000', color: '#fff', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px', fontWeight: '900' }}>{printOrder.customerName}</span>
                  <span style={{ fontSize: '20px', fontWeight: '900' }}>#{printOrder.id}</span>
                </div>

                {/* Customer Info (Notes / Address) */}
                <div style={{ marginBottom: '12px', padding: '0 4px' }}>
                  {printOrder.customerPhone && <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 'bold' }}>Tel: {printOrder.customerPhone}</p>}
                  {printOrder.nif && <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 'bold' }}>NIF: {printOrder.nif}</p>}
                  {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega') && printOrder.deliveryAddress && (
                    <>
                      <p style={{ margin: '4px 0 2px 0', fontSize: '14px' }}>{printOrder.deliveryAddress}</p>
                      {printOrder.deliveryZone && <p style={{ margin: '0', fontSize: '14px' }}>Zona: {printOrder.deliveryZone}</p>}
                    </>
                  )}
                </div>

                <div style={{ borderBottom: '2px solid #000', marginBottom: '10px' }}></div>

                {/* Order Items */}
                <div style={{ marginBottom: '10px' }}>
                  {safeParseItems(printOrder.items).map((item: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '16px', fontWeight: '800', flex: 1, paddingRight: '8px' }}>{item.quantity} x {item.name}</span>
                        <span style={{ fontSize: '16px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                          {(((item.basePrice !== undefined ? item.basePrice : item.priceCalculated) || 0) * (item.quantity || 1)).toFixed(2)} €
                        </span>
                      </div>
                      {item.extras && item.extras.length > 0 && item.extras.map((extra: any, extraIdx: number) => (
                        <div key={`${idx}-extra-${extraIdx}`} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '12px', marginTop: '2px' }}>
                          <span style={{ fontSize: '13px' }}>{extra.quantity > 1 ? `${extra.quantity}x ` : ''}{extra.name}</span>
                          <span style={{ fontSize: '13px' }}>{((extra.price || 0) * (item.quantity || 1)).toFixed(2)} €</span>
                        </div>
                      ))}
                      {item.notes && (
                        <p style={{ margin: '4px 0 0 12px', fontSize: '13px', fontStyle: 'italic' }}>Obs: {item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ borderBottom: '1px solid #000', marginBottom: '10px' }}></div>

                {/* Totals Section */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                    <span>Subtotal</span>
                    <span>{safeParseItems(printOrder.items).reduce((sum: number, item: any) => sum + (item.priceCalculated || 0) * (item.quantity || 1), 0).toFixed(2)} €</span>
                  </div>
                  {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega') && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                      <span>Taxa de Entrega</span>
                      <span>{((printOrder.totalAmount || 0) - safeParseItems(printOrder.items).reduce((sum: number, item: any) => sum + (item.priceCalculated || 0) * (item.quantity || 1), 0)).toFixed(2)} €</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', marginTop: '4px' }}>
                    <span>Montante pago</span>
                    <span>{(printOrder.totalAmount || 0).toFixed(2)} €</span>
                  </div>
                </div>

                {/* Payment + Time */}
                <div style={{ fontSize: '13px' }}>
                  <p style={{ margin: '0 0 4px 0' }}>Realizado a {new Date(printOrder.createdAt).toLocaleString('pt-PT')}</p>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                    {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega')
                      ? 'Entrega est.: 40 a 50 min'
                      : 'Recolher em: 25 a 35 min'}
                  </p>
                  <p style={{ margin: 0 }}>Pagamento: {printOrder.paymentMethod}</p>
                  {printOrder.changeFor && <p style={{ margin: '2px 0 0 0' }}>Troco para: € {printOrder.changeFor}</p>}
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #000', fontSize: '12px' }}>
                  <p style={{ margin: 0 }}>Obrigado por fazer um pedido de 41Menu's Pizzas e Esfihas</p>
                </div>
              </div>
            </div>
            {/* Modal Actions */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button
                onClick={handleConfirmPrint}
                style={{ flex: 1, backgroundColor: '#C81E3A', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} /> Imprimir
              </button>
              <button
                onClick={handleClosePrintPreview}
                style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
              >
                <X size={16} /> Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden receipt for actual printing */}
      {printOrder && (
        <div className="print-only">
          <div className="print-receipt-content">
            {/* Store Name + Order Type */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '24pt', fontWeight: '900', letterSpacing: '1px' }}>41 Menu's</h2>
              <span style={{ fontSize: '26pt', fontWeight: '800' }}>
                {printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega' ? 'ENTREGA' : 'RETIRADA'}
              </span>
            </div>

            {/* Customer Name + Order ID (Black Bar) */}
            <div style={{ backgroundColor: '#000', color: '#fff', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '24pt', fontWeight: '900' }}>{printOrder.customerName}</span>
              <span style={{ fontSize: '24pt', fontWeight: '900' }}>#{printOrder.id}</span>
            </div>

            {/* Customer Info (Notes / Address) */}
            <div style={{ marginBottom: '14px', padding: '0 4px' }}>
              {printOrder.customerPhone && <p style={{ margin: '0 0 2px 0', fontSize: '15pt', fontWeight: 'bold' }}>Tel: {printOrder.customerPhone}</p>}
              {printOrder.nif && <p style={{ margin: '0 0 2px 0', fontSize: '15pt', fontWeight: 'bold' }}>NIF: {printOrder.nif}</p>}
              {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega') && printOrder.deliveryAddress && (
                <>
                  <p style={{ margin: '4px 0 2px 0', fontSize: '16pt' }}>{printOrder.deliveryAddress}</p>
                  {printOrder.deliveryZone && <p style={{ margin: '0', fontSize: '16pt' }}>Zona: {printOrder.deliveryZone}</p>}
                </>
              )}
            </div>

            <div style={{ borderBottom: '2px solid #000', marginBottom: '12px' }}></div>

            {/* Order Items */}
            <div style={{ marginBottom: '12px' }}>
              {safeParseItems(printOrder.items).map((item: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '18pt', fontWeight: '800', flex: 1, paddingRight: '8px' }}>{item.quantity} x {item.name}</span>
                    <span style={{ fontSize: '18pt', fontWeight: '800', whiteSpace: 'nowrap' }}>
                      {(((item.basePrice !== undefined ? item.basePrice : item.priceCalculated) || 0) * (item.quantity || 1)).toFixed(2)} €
                    </span>
                  </div>
                  {item.extras && item.extras.length > 0 && item.extras.map((extra: any, extraIdx: number) => (
                    <div key={`${idx}-extra-${extraIdx}`} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '12px', marginTop: '2px' }}>
                      <span style={{ fontSize: '15pt' }}>{extra.quantity > 1 ? `${extra.quantity}x ` : ''}{extra.name}</span>
                      <span style={{ fontSize: '15pt' }}>{((extra.price || 0) * (item.quantity || 1)).toFixed(2)} €</span>
                    </div>
                  ))}
                  {item.notes && (
                    <p style={{ margin: '4px 0 0 12px', fontSize: '15pt', fontStyle: 'italic' }}>Obs: {item.notes}</p>
                  )}
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '2px solid #000', marginBottom: '12px' }}></div>

            {/* Totals Section */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16pt', marginBottom: '4px' }}>
                <span>Subtotal</span>
                <span>{safeParseItems(printOrder.items).reduce((sum: number, item: any) => sum + (item.priceCalculated || 0) * (item.quantity || 1), 0).toFixed(2)} €</span>
              </div>
              {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega') && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16pt', marginBottom: '4px' }}>
                  <span>Taxa de Entrega</span>
                  <span>{((printOrder.totalAmount || 0) - safeParseItems(printOrder.items).reduce((sum: number, item: any) => sum + (item.priceCalculated || 0) * (item.quantity || 1), 0)).toFixed(2)} €</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20pt', fontWeight: '900', marginTop: '4px' }}>
                <span>Montante pago</span>
                <span>{(printOrder.totalAmount || 0).toFixed(2)} €</span>
              </div>
            </div>

            {/* Payment + Time */}
            <div style={{ fontSize: '15pt' }}>
              <p style={{ margin: '0 0 4px 0' }}>Realizado a {new Date(printOrder.createdAt).toLocaleString('pt-PT')}</p>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
                {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega')
                  ? 'Entrega est.: 40 a 50 min'
                  : 'Recolher em: 25 a 35 min'}
              </p>
              <p style={{ margin: 0 }}>Pagamento: {printOrder.paymentMethod}</p>
              {printOrder.changeFor && <p style={{ margin: '2px 0 0 0' }}>Troco para: € {printOrder.changeFor}</p>}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '8px', borderTop: '2px solid #000', fontSize: '14pt' }}>
              <p style={{ margin: 0 }}>Obrigado por fazer um pedido de 41Menu's Pizzas e Esfihas</p>
            </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-stone-50 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-800">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-950 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-800 text-rose-500 rounded-md border border-stone-700">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-none text-white tracking-tight">Editar Pedido #{order.id}</h3>
              <p className="text-xs text-stone-400 mt-1.5 font-medium">Altere produtos, quantidades, taxas e descontos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white bg-stone-900 hover:bg-rose-600 rounded-md transition-colors cursor-pointer border border-stone-800 hover:border-rose-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Section 1: Customer Info */}
          <div className="bg-white p-4 rounded-md border border-stone-200 space-y-4">
            <h4 className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">Dados do Cliente & Entrega</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Nome do Cliente</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 rounded-md border border-stone-200 text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Telefone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 rounded-md border border-stone-200 text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Tipo de Pedido</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 rounded-md border border-stone-200 text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="entrega">Entrega (Delivery)</option>
                  <option value="retirada">Retirada (Takeaway)</option>
                  <option value="mesa">Consumo no Local (Mesa)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-50 rounded-md border border-stone-200 text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors cursor-pointer"
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
              <div className="pt-4 mt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Troco Para (€ / R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashProvided || ''}
                    onChange={(e) => setCashProvided(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 bg-stone-50 rounded-md border border-stone-200 text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors"
                    placeholder="Ex: 50.00"
                  />
                </div>
                <div className="flex flex-col justify-center bg-stone-50 p-2.5 rounded-md border border-stone-100">
                  <span className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">Troco Recalculado:</span>
                  <span className="text-lg font-black text-emerald-600 mt-1">€ {calculatedChange.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Items List & Add Items */}
          <div className="space-y-4 bg-white p-4 rounded-md border border-stone-200">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">Itens do Pedido ({items.length})</h4>
            </div>

            {/* Current Items Table */}
            <div className="border border-stone-200 rounded-md overflow-hidden bg-stone-50">
              {items.length === 0 ? (
                <div className="p-6 text-center text-sm text-stone-400 font-medium">Nenhum item no pedido.</div>
              ) : (
                <div className="divide-y divide-stone-200">
                  {items.map((item, idx) => {
                    const price = Number(item.priceCalculated || item.price || 0);
                    const qty = Number(item.quantity || 1);
                    return (
                      <div key={idx} className="p-3.5 flex items-center justify-between gap-3 bg-white hover:bg-stone-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-stone-900 truncate">{item.name}</div>
                          <div className="text-xs text-stone-500 font-medium mt-0.5">
                            {item.size ? `Tam: ${item.size} | ` : ''}€ {price.toFixed(2)} un.
                          </div>
                        </div>

                        {/* Qty Controls */}
                        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-md border border-stone-200">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, -1)}
                            className="w-7 h-7 rounded bg-white text-stone-800 font-bold flex items-center justify-center border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-extrabold text-stone-900">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, 1)}
                            className="w-7 h-7 rounded bg-white text-stone-800 font-bold flex items-center justify-center border border-stone-200 hover:border-stone-300 hover:bg-stone-50 transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="font-black text-sm text-stone-900 w-20 text-right">
                          € {(price * qty).toFixed(2)}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer border border-transparent hover:border-rose-100 ml-2"
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
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-md space-y-3">
              <h5 className="text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-stone-500" /> Adicionar Produto ao Pedido
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 relative">
                  <input
                    type="text"
                    value={selectedProductSearch}
                    onChange={(e) => setSelectedProductSearch(e.target.value)}
                    placeholder="Pesquisar produto pelo nome..."
                    className="w-full px-3 py-2.5 bg-white rounded-md border border-stone-200 text-sm font-bold text-stone-900 outline-none focus:border-stone-900 transition-colors"
                  />
                  {selectedProductSearch && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-300 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                      {filteredMenuItems.map(m => (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedProductId(m.id);
                            setSelectedProductSearch(m.name);
                          }}
                          className={`p-2.5 text-sm font-bold cursor-pointer flex justify-between border-b border-stone-100 last:border-0 ${selectedProductId === m.id ? 'bg-stone-900 text-white' : 'text-stone-800 hover:bg-stone-50'}`}
                        >
                          <span>{m.name}</span>
                          <span className={selectedProductId === m.id ? 'text-stone-300' : 'text-stone-500'}>€ {(m.priceSingle || m.priceP || m.priceM || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="flex-1 px-2 py-2.5 bg-white rounded-md border border-stone-200 text-sm font-bold text-stone-900 outline-none cursor-pointer"
                  >
                    <option value="priceSingle">Único/Padrão</option>
                    <option value="priceP">Tamanho P</option>
                    <option value="priceM">Tamanho M</option>
                    <option value="priceG">Tamanho G</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProductId}
                    className="px-4 py-2.5 bg-stone-900 hover:bg-stone-950 text-white font-bold rounded-md text-sm transition-colors disabled:opacity-50 cursor-pointer shrink-0 border border-stone-800"
                  >
                    Incluir
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Financial Adjustments (Desconto & Adicional & Audit Reason) */}
          <div className="bg-white p-4 rounded-md border border-stone-200 space-y-4">
            <h4 className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">Ajustes & Auditoria</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                  Desconto (- €)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-emerald-50/30 rounded-md border border-emerald-200 text-sm font-bold text-emerald-900 outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-amber-700 uppercase tracking-wider">
                  Taxa Adicional (+ €)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={additionalAmount || ''}
                  onChange={(e) => setAdditionalAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 bg-amber-50/30 rounded-md border border-amber-200 text-sm font-bold text-amber-900 outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Motivo da Alteração (Auditoria)</label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Ex: Cliente adicionou produto no balcão"
                className="w-full px-3 py-2.5 bg-stone-50 rounded-md border border-stone-200 text-sm font-bold text-stone-900 outline-none focus:border-stone-900 transition-colors"
              />
            </div>
          </div>

          {/* Section 4: Live Total Calculation Bar */}
          <div className="p-5 bg-stone-950 text-white rounded-md space-y-3 border border-stone-900 shadow-sm">
            <div className="flex justify-between text-xs text-stone-400 font-mono tracking-wide">
              <span>Subtotal dos Itens:</span>
              <span className="font-semibold text-stone-300">€ {subtotal.toFixed(2)}</span>
            </div>
            {additionalAmount > 0 && (
              <div className="flex justify-between text-xs text-amber-400/90 font-mono tracking-wide">
                <span>(+) Taxa Adicional:</span>
                <span className="font-semibold">+ € {Number(additionalAmount).toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400/90 font-mono tracking-wide">
                <span>(-) Desconto:</span>
                <span className="font-semibold">- € {Number(discountAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="pt-3 border-t border-stone-800 flex justify-between items-end">
              <span className="text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider">Total Recalculado</span>
              <span className="text-3xl font-black text-rose-500 leading-none">€ {finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-md font-bold text-sm bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer border border-stone-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 rounded-md font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:translate-y-px cursor-pointer flex items-center gap-2 border border-rose-700"
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

interface SparklineData {
  data: number[];
  color: string;
}

function Sparkline({ data, color }: SparklineData) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 36;
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const path = `M${points}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-[100px] h-[36px]">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={path}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="transition-all duration-300"
      />
      <path
        d={path}
        stroke="url(#sparkline-gradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.5}
      />
    </svg>
  );
}

function KpiCard({ 
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
}

function ReportCard({ 
  title, 
  value, 
  icon, 
  iconBg,
  onClick,
  subtitle
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  iconBg: string;
  onClick: () => void;
  subtitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white p-5 rounded-lg border border-stone-200 hover:border-stone-400 transition-colors cursor-pointer flex flex-col items-center justify-center text-center min-h-[120px] relative text-left w-full group"
    >
      <div className={`p-2.5 rounded-lg ${iconBg} border border-current/20 text-current mb-2.5 group-hover:scale-105 transition-transform`}>
        {icon}
      </div>
      <div className="w-full">
        <p className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-500 mb-1">{title}</p>
        {value ? (
          <p className="text-xl font-bold font-mono tabular-nums text-stone-900 tracking-tight">{value}</p>
        ) : (
          <p className="text-xs text-stone-500 font-mono">{subtitle || ''}</p>
        )}
      </div>
      <ArrowDownRight className="absolute bottom-3 right-3 text-stone-400 group-hover:text-stone-900 transition-colors w-4 h-4" />
    </button>
  );
}