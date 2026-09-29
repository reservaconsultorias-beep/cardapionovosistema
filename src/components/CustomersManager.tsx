import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, X, Award, ShoppingBag, ChevronDown, 
  User, Phone, MapPin, Calendar, Clock, DollarSign, 
  TrendingUp, MessageCircle, Download, Sparkles, Filter, 
  ExternalLink, RefreshCw, AlertTriangle, Heart, Flame, 
  FileText, CheckCircle2, Copy, Send, Check,
  ArrowUpRight, Star, AlertCircle, Pizza, Bike, Store, CreditCard
} from 'lucide-react';
import PeriodFilterCompact, { PeriodFilterOption } from './PeriodFilterCompact';

export type CustomerSegment = 'todos' | 'vip' | 'recorrente' | 'novo' | 'em_risco' | 'inativo';

export interface CustomerProfile {
  id: string;
  phone: string;
  formattedPhone: string;
  name: string;
  total_orders: number;
  total_spent: number;
  ticket_medio: number;
  first_order_at: string | null;
  last_order_at: string | null;
  days_since_last_order: number;
  segment: 'vip' | 'recorrente' | 'novo' | 'em_risco' | 'inativo';
  primary_address: string;
  addresses: string[];
  primary_zone: string;
  primary_payment_method: string;
  delivery_percentage: number;
  favorite_items: { name: string; count: number }[];
  favorite_extras: { name: string; count: number }[];
  notes: string;
  raw_orders: any[];
}

export default function CustomersManager() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>('todos');

  // Filtros de Período e Ordenação
  const [period, setPeriod] = useState<PeriodFilterOption>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'spent' | 'orders' | 'ticket' | 'inactive'>('recent');

  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Formata telefone para exibição e link internacional (Portugal padrão)
  const formatPhoneForWhatsApp = (rawPhone: string): string => {
    const clean = rawPhone.replace(/\D/g, '');
    if (!clean) return '';
    if (clean.startsWith('351')) return clean;
    if (clean.length === 9) return `351${clean}`;
    return clean;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Carrega todos os pedidos para agregar inteligência comercial real
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('id, customer_name, customer_phone, delivery_address, delivery_zone, total_amount, payment_method, order_type, status, items, notes, created_at')
        .order('created_at', { ascending: false });

      if (ordersErr) console.warn('Erro ao carregar pedidos para CRM:', ordersErr);

      // 2. Carrega tabela de clientes (para notas e cadastros salvos)
      const { data: dbCustomers } = await supabase
        .from('customers')
        .select('*');

      // 3. Carrega notas personalizadas da tabela settings (fallback persistente)
      const { data: settingsNotes } = await supabase
        .from('settings')
        .select('key, value')
        .like('key', 'customer_notes_%');

      const notesMap: Record<string, { address?: string; notes?: string; name?: string }> = {};
      if (settingsNotes) {
        settingsNotes.forEach((s: any) => {
          const p = s.key.replace('customer_notes_', '');
          if (p && s.value) notesMap[p] = s.value;
        });
      }

      if (dbCustomers) {
        dbCustomers.forEach((c: any) => {
          const p = String(c.phone || '').replace(/\D/g, '');
          if (p) {
            notesMap[p] = {
              name: c.name || notesMap[p]?.name,
              address: c.address || notesMap[p]?.address,
              notes: c.notes || notesMap[p]?.notes,
            };
          }
        });
      }

      // 4. Agrega e calcula perfis de clientes unificados
      const customerMap: Record<string, {
        name: string;
        phone: string;
        orders: any[];
        addresses: Set<string>;
        zones: Record<string, number>;
        paymentMethods: Record<string, number>;
        orderTypes: Record<string, number>;
        itemCounts: Record<string, number>;
        extraCounts: Record<string, number>;
        firstDate: string;
        lastDate: string;
      }> = {};

      const allOrders = ordersData || [];

      for (const o of allOrders) {
        const rawPhone = String(o.customer_phone || '').trim();
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 8) continue;

        if (!customerMap[cleanPhone]) {
          customerMap[cleanPhone] = {
            name: o.customer_name || 'Cliente',
            phone: cleanPhone,
            orders: [],
            addresses: new Set(),
            zones: {},
            paymentMethods: {},
            orderTypes: {},
            itemCounts: {},
            extraCounts: {},
            firstDate: o.created_at,
            lastDate: o.created_at
          };
        }

        const entry = customerMap[cleanPhone];
        entry.orders.push(o);

        // Atualiza melhor nome disponível
        if (o.customer_name && o.customer_name.length > entry.name.length && !o.customer_name.toLowerCase().includes('41 menu')) {
          entry.name = o.customer_name.trim();
        }

        // Datas
        if (new Date(o.created_at) < new Date(entry.firstDate)) entry.firstDate = o.created_at;
        if (new Date(o.created_at) > new Date(entry.lastDate)) entry.lastDate = o.created_at;

        // Endereços e Zonas
        if (o.delivery_address && o.delivery_address.trim().length > 3) {
          entry.addresses.add(o.delivery_address.trim());
        }
        if (o.delivery_zone) {
          entry.zones[o.delivery_zone] = (entry.zones[o.delivery_zone] || 0) + 1;
        }

        // Formas de Pagamento
        if (o.payment_method) {
          entry.paymentMethods[o.payment_method] = (entry.paymentMethods[o.payment_method] || 0) + 1;
        }

        // Tipo de Pedido (Delivery / Takeaway / Mesa)
        const t = (o.order_type || 'delivery').toLowerCase();
        entry.orderTypes[t] = (entry.orderTypes[t] || 0) + 1;

        // Itens e Sabores Favoritos
        if (o.items) {
          let itemsList: any[] = [];
          if (Array.isArray(o.items)) itemsList = o.items;
          else if (typeof o.items === 'string') {
            try { itemsList = JSON.parse(o.items); } catch { itemsList = []; }
          }

          itemsList.forEach((it: any) => {
            const itemName = String(it.name || '').trim();
            const qty = Number(it.quantity) || 1;
            if (itemName) {
              entry.itemCounts[itemName] = (entry.itemCounts[itemName] || 0) + qty;
            }

            if (it.extras && Array.isArray(it.extras)) {
              it.extras.forEach((ext: any) => {
                const extName = String(ext.name || '').trim();
                if (extName) {
                  entry.extraCounts[extName] = (entry.extraCounts[extName] || 0) + qty;
                }
              });
            }
          });
        }
      }

      // Monta os perfis calculados
      const profiles: CustomerProfile[] = Object.values(customerMap).map(entry => {
        const nonCanceledOrders = entry.orders.filter(o => o.status !== 'Cancelado');
        const totalSpent = nonCanceledOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const totalOrders = nonCanceledOrders.length || entry.orders.length;
        const ticketMedio = totalOrders > 0 ? totalSpent / totalOrders : 0;

        const now = Date.now();
        const lastOrderTime = new Date(entry.lastDate).getTime();
        const daysSinceLastOrder = Math.max(0, Math.floor((now - lastOrderTime) / (1000 * 60 * 60 * 24)));

        // Determina segmento
        let segment: 'vip' | 'recorrente' | 'novo' | 'em_risco' | 'inativo' = 'recorrente';
        if (totalOrders >= 5 || totalSpent >= 150) {
          segment = 'vip';
        } else if (totalOrders === 1) {
          segment = 'novo';
        } else if (daysSinceLastOrder > 60) {
          segment = 'inativo';
        } else if (daysSinceLastOrder > 30) {
          segment = 'em_risco';
        } else {
          segment = 'recorrente';
        }

        // Preferências
        const sortedItems = Object.entries(entry.itemCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));

        const sortedExtras = Object.entries(entry.extraCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));

        const primaryAddress = Array.from(entry.addresses)[0] || '';
        const primaryZone = Object.entries(entry.zones).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        const primaryPayment = Object.entries(entry.paymentMethods).sort((a, b) => b[1] - a[1])[0]?.[0] || 'MB Way';

        const deliveryCount = entry.orderTypes['delivery'] || 0;
        const totalTypeOrders = Object.values(entry.orderTypes).reduce((a, b) => a + b, 0) || 1;
        const deliveryPercentage = Math.round((deliveryCount / totalTypeOrders) * 100);

        // Mescla notas salvas
        const savedMeta = notesMap[entry.phone];
        const finalName = savedMeta?.name || entry.name;
        const finalAddress = savedMeta?.address || primaryAddress;
        const finalNotes = savedMeta?.notes || '';

        return {
          id: entry.phone,
          phone: entry.phone,
          formattedPhone: entry.phone.length === 9 ? `${entry.phone.slice(0, 3)} ${entry.phone.slice(3, 6)} ${entry.phone.slice(6)}` : entry.phone,
          name: finalName,
          total_orders: totalOrders,
          total_spent: totalSpent,
          ticket_medio: ticketMedio,
          first_order_at: entry.firstDate,
          last_order_at: entry.lastDate,
          days_since_last_order: daysSinceLastOrder,
          segment,
          primary_address: finalAddress,
          addresses: Array.from(entry.addresses),
          primary_zone: primaryZone,
          primary_payment_method: primaryPayment,
          delivery_percentage: deliveryPercentage,
          favorite_items: sortedItems,
          favorite_extras: sortedExtras,
          notes: finalNotes,
          raw_orders: entry.orders
        };
      });

      setCustomers(profiles);
    } catch (err) {
      console.error('Erro ao construir inteligência de clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // KPIs da Carteira de Clientes
  const stats = useMemo(() => {
    const totalCount = customers.length;
    const vipCount = customers.filter(c => c.segment === 'vip').length;
    const activeCount = customers.filter(c => c.days_since_last_order <= 30).length;
    const riskCount = customers.filter(c => c.segment === 'em_risco').length;
    const inactiveCount = customers.filter(c => c.segment === 'inativo').length;
    const newCount = customers.filter(c => c.segment === 'novo').length;
    const recurringCount = customers.filter(c => c.segment === 'recorrente').length;

    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
    const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalCount,
      vipCount,
      activeCount,
      riskCount,
      inactiveCount,
      newCount,
      recurringCount,
      totalRevenue,
      avgTicket
    };
  }, [customers]);

  // Filtragem e Ordenação
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. Filtro de Segmento
      if (activeSegment !== 'todos' && c.segment !== activeSegment) {
        return false;
      }

      // 2. Filtro de Busca Texto
      const term = search.toLowerCase();
      const matchesSearch = 
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term) ||
        c.primary_address.toLowerCase().includes(term) ||
        c.favorite_items.some(it => it.name.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      // 3. Filtro de Período (baseado na data do último pedido)
      if (period === 'todos') return true;
      if (!c.last_order_at) return false;

      const orderDate = new Date(c.last_order_at);
      const now = new Date();

      if (period === 'hoje') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        return orderDate >= start;
      }
      if (period === 'ontem') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }
      if (period === '7dias') {
        const limit = new Date(now);
        limit.setDate(limit.getDate() - 6);
        limit.setHours(0, 0, 0, 0);
        return orderDate >= limit;
      }
      if (period === '30dias') {
        const limit = new Date(now);
        limit.setDate(limit.getDate() - 29);
        limit.setHours(0, 0, 0, 0);
        return orderDate >= limit;
      }
      if (period === 'mes') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        return orderDate >= start;
      }
      if (period === 'mes_passado') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }
      if (period === 'customizado' && startDate && endDate) {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59.999');
        return orderDate >= start && orderDate <= end;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'spent') return b.total_spent - a.total_spent;
      if (sortBy === 'orders') return b.total_orders - a.total_orders;
      if (sortBy === 'ticket') return b.ticket_medio - a.ticket_medio;
      if (sortBy === 'inactive') return b.days_since_last_order - a.days_since_last_order;
      return new Date(b.last_order_at || 0).getTime() - new Date(a.last_order_at || 0).getTime();
    });
  }, [customers, activeSegment, search, period, startDate, endDate, sortBy]);

  // Exportação para CSV (UTF-8 com BOM para Excel)
  const exportToCSV = () => {
    if (filteredCustomers.length === 0) {
      alert('Nenhum cliente disponível para exportar no filtro atual.');
      return;
    }

    const headers = [
      'Nome',
      'Telefone',
      'Segmento',
      'Pedidos',
      'Total Gasto (EUR)',
      'Ticket Medio (EUR)',
      'Ultimo Pedido (Data)',
      'Dias sem Comprar',
      'Item Mais Pedido',
      'Endereco',
      'Notas Internas'
    ];

    const rows = filteredCustomers.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.segment.toUpperCase()}"`,
      c.total_orders,
      c.total_spent.toFixed(2),
      c.ticket_medio.toFixed(2),
      c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('pt-PT') : '-',
      c.days_since_last_order,
      `"${(c.favorite_items[0]?.name || '').replace(/"/g, '""')}"`,
      `"${(c.primary_address || '').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes_crm_41menus_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const getSegmentBadge = (segment: CustomerProfile['segment']) => {
    switch (segment) {
      case 'vip':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
            <Star size={10} className="fill-amber-500 text-amber-500" /> VIP
          </span>
        );
      case 'recorrente':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw size={10} className="text-blue-500" /> Recorrente
          </span>
        );
      case 'novo':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sparkles size={10} className="text-emerald-500" /> 1º Pedido
          </span>
        );
      case 'em_risco':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle size={10} className="text-orange-500" /> Em Risco
          </span>
        );
      case 'inativo':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
            <Clock size={10} className="text-stone-400" /> Inativo
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
        <span className="text-xs font-mono font-medium text-stone-500">
          Carregando dados e inteligência comercial dos clientes...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. COCKPIT DE INTELIGÊNCIA COMERCIAL (TOP KPIS)
      ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Total Clientes */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span className="font-semibold text-stone-600">Base Total</span>
            <User size={15} className="text-stone-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900">
            {stats.totalCount}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 flex items-center gap-1 font-mono">
            <span className="text-emerald-600 font-semibold">{stats.newCount} novos</span>
            <span>•</span>
            <span className="text-blue-600 font-semibold">{stats.recurringCount} fiéis</span>
          </div>
        </div>

        {/* Clientes VIP */}
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-amber-700 text-xs mb-1">
            <span className="font-bold">Clientes VIP</span>
            <Star size={15} className="fill-amber-500 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-900">
            {stats.vipCount}
          </div>
          <div className="text-[10px] text-amber-700 mt-1 font-mono">
            ≥ 5 pedidos ou alto valor
          </div>
        </div>

        {/* Clientes Ativos (30 dias) */}
        <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span className="font-semibold text-stone-600">Ativos no Mês</span>
            <Flame size={15} className="text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
            {stats.activeCount}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 font-mono">
            Compraram nos últimos 30 dias
          </div>
        </div>

        {/* Clientes em Risco / Inativos */}
        <div className="bg-white p-3.5 rounded-xl border border-orange-200 bg-orange-50/20 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-orange-700 text-xs mb-1">
            <span className="font-bold">Em Risco / Inativos</span>
            <AlertTriangle size={15} className="text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-orange-800">
            {stats.riskCount + stats.inactiveCount}
          </div>
          <div className="text-[10px] text-orange-700 mt-1 font-mono">
            {stats.riskCount} em risco • {stats.inactiveCount} inativos
          </div>
        </div>

        {/* Ticket Médio Geral */}
        <div className="bg-stone-900 text-white p-3.5 rounded-xl border border-stone-800 shadow-2xs relative overflow-hidden col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span className="font-semibold text-stone-300">Ticket Médio</span>
            <TrendingUp size={15} className="text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            € {stats.avgTicket.toFixed(2)}
          </div>
          <div className="text-[10px] text-stone-400 mt-1 font-mono truncate">
            Total Carteira: € {stats.totalRevenue.toFixed(0)}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PAINEL PRINCIPAL DO CRM & FERRAMENTAS
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-3.5 sm:p-4 space-y-3.5">
        
        {/* Linha 1: Segmentação Rápida (Abas Automáticas) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-stone-100 no-scrollbar">
          <button
            onClick={() => setActiveSegment('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 cursor-pointer ${
              activeSegment === 'todos'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100/80 hover:bg-stone-200/70 text-stone-600'
            }`}
          >
            Todos ({stats.totalCount})
          </button>

          <button
            onClick={() => setActiveSegment('vip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSegment === 'vip'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100/70 text-amber-800 border border-amber-200'
            }`}
          >
            <Star size={12} className={activeSegment === 'vip' ? 'fill-stone-950 text-stone-950' : 'fill-amber-500 text-amber-500'} />
            <span>VIPs ({stats.vipCount})</span>
          </button>

          <button
            onClick={() => setActiveSegment('recorrente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeSegment === 'recorrente'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100/70 text-blue-700 border border-blue-200'
            }`}
          >
            <RefreshCw size={11} />
            <span>Recorrentes ({stats.recurringCount})</span>
          </button>

          <button
            onClick={() => setActiveSegment('novo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeSegment === 'novo'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100/70 text-emerald-800 border border-emerald-200'
            }`}
          >
            <Sparkles size={11} />
            <span>Novos / 1º Pedido ({stats.newCount})</span>
          </button>

          <button
            onClick={() => setActiveSegment('em_risco')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeSegment === 'em_risco'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 hover:bg-orange-100/70 text-orange-800 border border-orange-200'
            }`}
          >
            <AlertTriangle size={11} />
            <span>Em Risco ({stats.riskCount})</span>
          </button>

          <button
            onClick={() => setActiveSegment('inativo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
              activeSegment === 'inativo'
                ? 'bg-stone-700 text-white shadow-xs'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
            }`}
          >
            <Clock size={11} />
            <span>Inativos (+60d) ({stats.inactiveCount})</span>
          </button>
        </div>

        {/* Linha 2: Barra de Filtros, Busca, Ordenação e Exportar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-2.5">
          {/* Busca Texto */}
          <div className="relative flex-1 w-full lg:max-w-xs">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, sabor, rua..."
              className="h-8 pl-8 pr-3 bg-stone-50/80 focus:bg-white border border-stone-200 focus:border-amber-400 rounded-lg text-xs font-mono text-stone-900 focus:outline-none w-full shadow-2xs transition-colors"
            />
          </div>

          {/* Grupo de Controles da Direita */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Filtro de Período da Última Compra */}
            <PeriodFilterCompact
              value={period}
              startDate={startDate}
              endDate={endDate}
              onChange={(res) => {
                setPeriod(res.period);
                if (res.startDate !== undefined) setStartDate(res.startDate);
                if (res.endDate !== undefined) setEndDate(res.endDate);
              }}
            />

            {/* Ordenação */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8 pl-2.5 pr-7 border border-stone-200 hover:border-stone-300 bg-white text-stone-700 rounded-lg text-xs font-mono font-medium appearance-none cursor-pointer shadow-2xs focus:outline-none focus:border-amber-400"
              >
                <option value="recent">Última Compra</option>
                <option value="spent">+ Faturamento (€)</option>
                <option value="orders">+ Pedidos Realizados</option>
                <option value="ticket">+ Ticket Médio (€)</option>
                <option value="inactive">+ Tempo Sem Comprar</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>

            {/* Botão Exportar CSV */}
            <button
              onClick={exportToCSV}
              className="h-8 px-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 hover:text-stone-900 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Exportar lista filtrada para Excel / CSV"
            >
              <Download size={13} className="text-stone-600" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. TABELA DE ALTA DENSIDADE E INTELIGÊNCIA COMERCIAL
        ─────────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto border border-stone-200/90 rounded-xl">
          <table className="min-w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/90 text-stone-600 font-mono uppercase text-[10.5px]">
                <th className="py-2.5 px-3.5 font-bold">Cliente & Segmento</th>
                <th className="py-2.5 px-3 font-bold">Telefone / WhatsApp</th>
                <th className="py-2.5 px-3 font-bold text-center">Pedidos</th>
                <th className="py-2.5 px-3 font-bold text-right">Total Gasto</th>
                <th className="py-2.5 px-3 font-bold text-right">Ticket Médio</th>
                <th className="py-2.5 px-3 font-bold">Última Compra</th>
                <th className="py-2.5 px-3 font-bold">Preferência</th>
                <th className="py-2.5 px-3 font-bold text-center">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400 font-mono">
                    Nenhum cliente encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const whatsappLink = `https://wa.me/${formatPhoneForWhatsApp(c.phone)}`;
                  const isCopied = copiedPhone === c.phone;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Cliente e Segmento */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-stone-900 group-hover:text-amber-900 text-xs">
                              {c.name || 'Cliente'}
                            </span>
                            {getSegmentBadge(c.segment)}
                          </div>
                          {c.first_order_at && (
                            <span className="text-[9.5px] text-stone-400 mt-0.5">
                              Cliente desde {new Date(c.first_order_at).toLocaleDateString('pt-PT')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Telefone e Botão WhatsApp */}
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-stone-700 text-xs">{c.formattedPhone}</span>
                          <button
                            onClick={(e) => copyPhone(c.phone, e)}
                            className="p-1 text-stone-300 hover:text-stone-600 rounded transition-colors"
                            title="Copiar telefone"
                          >
                            {isCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          </button>
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle size={12} />
                          </a>
                        </div>
                      </td>

                      {/* Pedidos */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded font-bold bg-stone-100 text-stone-800 text-[11px] border border-stone-200">
                          {c.total_orders}
                        </span>
                      </td>

                      {/* Total Gasto */}
                      <td className="py-2.5 px-3 text-right font-bold text-stone-900 text-xs">
                        € {c.total_spent.toFixed(2)}
                      </td>

                      {/* Ticket Médio */}
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 text-xs">
                        € {c.ticket_medio.toFixed(2)}
                      </td>

                      {/* Última Compra */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              c.days_since_last_order <= 7 
                                ? 'bg-emerald-500' 
                                : c.days_since_last_order <= 30 
                                ? 'bg-blue-500' 
                                : c.days_since_last_order <= 60 
                                ? 'bg-orange-500' 
                                : 'bg-rose-500'
                            }`} />
                            <span className={`font-semibold text-xs ${
                              c.days_since_last_order > 60 
                                ? 'text-stone-500' 
                                : c.days_since_last_order > 30 
                                ? 'text-orange-700' 
                                : 'text-stone-800'
                            }`}>
                              {c.days_since_last_order === 0 ? 'Hoje' : c.days_since_last_order === 1 ? 'Ontem' : `Há ${c.days_since_last_order} dias`}
                            </span>
                          </div>
                          <span className="text-[9.5px] text-stone-400">
                            {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('pt-PT') : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Preferência / Item Mais Pedido */}
                      <td className="py-2.5 px-3 max-w-[170px] truncate">
                        {c.favorite_items.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] text-stone-600 bg-stone-50 px-1.5 py-0.5 rounded border border-stone-200 truncate">
                            <Pizza size={10} className="text-amber-600 shrink-0" />
                            <span className="truncate">{c.favorite_items[0].name}</span>
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Botão Ver Ficha */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[11px] font-bold text-amber-700 group-hover:underline flex items-center justify-center gap-0.5">
                          Ver <ArrowUpRight size={12} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da tabela com totalizadores */}
        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-stone-500 pt-1">
          <span>Mostrando <strong>{filteredCustomers.length}</strong> de <strong>{customers.length}</strong> clientes</span>
          <span>Faturamento Filtrado: <strong className="text-stone-900">€ {filteredCustomers.reduce((acc, c) => acc + c.total_spent, 0).toFixed(2)}</strong></span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL / FICHA COMPLETA DO CLIENTE
      ─────────────────────────────────────────────────────────────── */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onSaveNotes={async (updatedMeta) => {
            // Salva no banco com persistência dupla (customers e settings)
            try {
              try {
                await supabase.from('customers').upsert({
                  phone: selectedCustomer.phone,
                  name: updatedMeta.name,
                  address: updatedMeta.address,
                  notes: updatedMeta.notes,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'phone' });
              } catch (e) {
                console.warn('Aviso upsert customers:', e);
              }

              await supabase.from('settings').upsert({
                key: `customer_notes_${selectedCustomer.phone}`,
                value: updatedMeta,
                updated_at: new Date().toISOString()
              }, { onConflict: 'key' });

              // Atualiza estado local
              setCustomers(prev => prev.map(c => c.phone === selectedCustomer.phone ? {
                ...c,
                name: updatedMeta.name || c.name,
                primary_address: updatedMeta.address || c.primary_address,
                notes: updatedMeta.notes || ''
              } : c));

              setSelectedCustomer(prev => prev ? {
                ...prev,
                name: updatedMeta.name || prev.name,
                primary_address: updatedMeta.address || prev.primary_address,
                notes: updatedMeta.notes || ''
              } : null);

            } catch (err) {
              console.error('Erro ao salvar ficha:', err);
              alert('Não foi possível salvar os dados do cliente.');
            }
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: FICHA DETALHADA DO CLIENTE (CRM INDIVIDUAL)
// ─────────────────────────────────────────────────────────────────────────────
interface CustomerDetailModalProps {
  customer: CustomerProfile;
  onClose: () => void;
  onSaveNotes: (updatedData: { name: string; address: string; notes: string }) => Promise<void>;
}

function CustomerDetailModal({ customer, onClose, onSaveNotes }: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'historico' | 'acoes_whatsapp' | 'cadastro'>('historico');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: customer.name || '',
    address: customer.primary_address || '',
    notes: customer.notes || ''
  });

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const cleanPhone = customer.phone.replace(/\D/g, '');
  const internationalPhone = cleanPhone.startsWith('351') ? cleanPhone : `351${cleanPhone}`;

  // Modelos de mensagens prontas para WhatsApp
  const firstName = customer.name.split(' ')[0] || 'Cliente';
  const favoritePizza = customer.favorite_items[0]?.name || 'sua pizza favorita';

  const messageTemplates = [
    {
      title: '🎁 Reativação / Sentimos sua Falta',
      desc: 'Ideal para clientes em risco ou inativos (+30 dias sem pedir).',
      text: `Olá ${firstName}! Tudo bem? 🍕\nSentimos sua falta aqui na 41 Menu's! Preparamos um mimo especial para o seu próximo pedido hoje. Gostaria de dar uma olhada no nosso cardápio atualizado?`
    },
    {
      title: '🌟 Reconhecimento & Benefício VIP',
      desc: 'Para fortalecer o relacionamento com seus clientes mais leais.',
      text: `Olá ${firstName}! Passando para agradecer pela sua preferência de sempre como cliente VIP da 41 Menu's! ⭐\nNa sua próxima pizza grande, a sobremesa ou a borda recheada é por nossa conta. Vamos pedir hoje?`
    },
    {
      title: '🌱 Pós-Venda (Novo Cliente)',
      desc: 'Acompanhar quem acabou de fazer o 1º pedido para garantir a satisfação.',
      text: `Olá ${firstName}, tudo bem? Aqui é da equipe da 41 Menu's. Passando para saber como foi a sua experiência com a nossa pizza! Seu feedback é muito importante para nós. Esperamos que tenha adorado! 😊`
    },
    {
      title: '🍕 Oferta do Sabor Favorito',
      desc: `Oferecer diretamente ${favoritePizza}.`,
      text: `Olá ${firstName}! Hoje o forno da 41 Menu's já está a todo vapor e lembrei de você! Que tal pedir aquela ${favoritePizza} quentinha hoje para o jantar? 🍕`
    }
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSaveNotes(formData);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo / Header da Ficha */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50/80 flex flex-wrap justify-between items-start gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
              {customer.name ? customer.name.charAt(0).toUpperCase() : <User size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg text-stone-900 leading-tight">
                  {customer.name || 'Cliente'}
                </h3>
                {customer.segment === 'vip' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    ⭐ VIP
                  </span>
                )}
                {customer.segment === 'novo' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    🌱 Novo Cliente
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-stone-500 mt-0.5">
                <span>{customer.formattedPhone}</span>
                {customer.first_order_at && (
                  <>
                    <span>•</span>
                    <span>Cliente desde {new Date(customer.first_order_at).toLocaleDateString('pt-PT')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${internationalPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <MessageCircle size={14} />
              <span>WhatsApp</span>
            </a>

            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-400 hover:text-stone-700 transition-colors"
              title="Fechar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 4 Cards de Resumo Financeiro e Frequência do Cliente */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 bg-stone-100/60 border-b border-stone-200 shrink-0">
          <div className="bg-white p-2.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block">Total Gasto</span>
            <span className="text-base sm:text-lg font-black font-mono text-stone-900">€ {customer.total_spent.toFixed(2)}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block">Pedidos Feitos</span>
            <span className="text-base sm:text-lg font-black font-mono text-stone-900">{customer.total_orders} pedidos</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block">Ticket Médio</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-700">€ {customer.ticket_medio.toFixed(2)}</span>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-stone-200">
            <span className="text-[10px] font-mono font-bold text-stone-400 uppercase block">Última Compra</span>
            <span className="text-base sm:text-lg font-black font-mono text-stone-900">
              {customer.days_since_last_order === 0 ? 'Hoje' : `Há ${customer.days_since_last_order}d`}
            </span>
          </div>
        </div>

        {/* Bloco de Preferências & Padrões Extraídos por Inteligência */}
        <div className="px-4 py-2.5 bg-amber-50/40 border-b border-amber-200/60 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-stone-700 font-mono shrink-0">
          {customer.favorite_items.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Pizza size={13} className="text-amber-600 shrink-0" />
              <span>Favorito: <strong>{customer.favorite_items[0].name}</strong> ({customer.favorite_items[0].count}x)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Bike size={13} className="text-blue-600 shrink-0" />
            <span>Preferência: <strong>{customer.delivery_percentage}% Entrega</strong></span>
          </div>
          {customer.primary_zone && (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-rose-600 shrink-0" />
              <span>Zona: <strong>{customer.primary_zone}</strong></span>
            </div>
          )}
          {customer.primary_payment_method && (
            <div className="flex items-center gap-1.5">
              <CreditCard size={13} className="text-emerald-600 shrink-0" />
              <span>Pagamento: <strong>{customer.primary_payment_method}</strong></span>
            </div>
          )}
        </div>

        {/* Tabs da Ficha */}
        <div className="flex border-b border-stone-200 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'historico' ? 'border-amber-500 text-amber-900 bg-amber-50/20' : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <ShoppingBag size={13} />
            <span>HISTÓRICO ({customer.raw_orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('acoes_whatsapp')}
            className={`flex-1 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'acoes_whatsapp' ? 'border-emerald-500 text-emerald-900 bg-emerald-50/20' : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Send size={13} />
            <span>MENSAGENS WHATSAPP</span>
          </button>

          <button
            onClick={() => setActiveTab('cadastro')}
            className={`flex-1 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'cadastro' ? 'border-amber-500 text-amber-900 bg-amber-50/20' : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <FileText size={13} />
            <span>EDITAR CADASTRO & NOTAS</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white">
          
          {/* ABA 1: HISTÓRICO DE PEDIDOS DETALHADO */}
          {activeTab === 'historico' && (
            <div className="space-y-3">
              {customer.raw_orders.length === 0 ? (
                <div className="text-center text-stone-400 py-10 font-mono text-xs">
                  Nenhum pedido registrado para este cliente.
                </div>
              ) : (
                customer.raw_orders.map((o: any) => {
                  let itemsList: any[] = [];
                  if (Array.isArray(o.items)) itemsList = o.items;
                  else if (typeof o.items === 'string') {
                    try { itemsList = JSON.parse(o.items); } catch { itemsList = []; }
                  }

                  const isCanceled = o.status === 'Cancelado';

                  return (
                    <div 
                      key={o.id} 
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCanceled 
                          ? 'border-stone-200 bg-stone-50/50 opacity-60' 
                          : 'border-stone-200 bg-stone-50/40 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 pb-2 mb-2 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-stone-900">Pedido #{o.id}</span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(o.created_at).toLocaleString('pt-PT')}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold uppercase bg-stone-200/80 text-stone-700">
                            {o.order_type || 'Delivery'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.status === 'Finalizado' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isCanceled 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {o.status}
                          </span>
                          <span className="font-black text-xs text-stone-900 font-mono">
                            € {Number(o.total_amount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Itens do Pedido */}
                      <div className="space-y-1">
                        {itemsList.map((it: any, iIdx: number) => (
                          <div key={iIdx} className="text-xs text-stone-700 flex justify-between items-start font-mono">
                            <div className="flex-1 pr-2">
                              <span className="font-bold text-stone-900">{it.quantity}x</span> {it.name}
                              {it.extras && it.extras.length > 0 && (
                                <div className="text-[10px] text-amber-700 pl-4">
                                  + {it.extras.map((e: any) => e.name).join(', ')}
                                </div>
                              )}
                              {it.notes && (
                                <div className="text-[10px] text-stone-500 italic pl-4">
                                  Obs: {it.notes}
                                </div>
                              )}
                            </div>
                            <span className="font-semibold text-stone-600 shrink-0">
                              € {Number(it.priceCalculated || it.basePrice || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {o.delivery_address && (
                        <div className="mt-2 pt-2 border-t border-stone-200/50 text-[10.5px] text-stone-500 font-mono flex items-center gap-1">
                          <MapPin size={11} className="text-stone-400 shrink-0" />
                          <span className="truncate">{o.delivery_address} {o.delivery_zone ? `(${o.delivery_zone})` : ''}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ABA 2: AÇÕES RÁPIDAS DE WHATSAPP (MODELOS DE FIDELIZAÇÃO) */}
          {activeTab === 'acoes_whatsapp' && (
            <div className="space-y-3 font-mono">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                💡 <strong>Disparo Inteligente 1-Click:</strong> Escolha um dos modelos abaixo para abrir o WhatsApp Web já com a mensagem personalizada com o nome e sabor favorito do cliente.
              </div>

              <div className="grid grid-cols-1 gap-3">
                {messageTemplates.map((tmpl, idx) => {
                  const encodedMsg = encodeURIComponent(tmpl.text);
                  const waUrl = `https://wa.me/${internationalPhone}?text=${encodedMsg}`;

                  return (
                    <div key={idx} className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-stone-900">{tmpl.title}</span>
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Send size={11} />
                          <span>Enviar WhatsApp</span>
                        </a>
                      </div>
                      <p className="text-[10px] text-stone-500 font-sans">{tmpl.desc}</p>
                      <div className="p-2.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 whitespace-pre-wrap font-sans">
                        {tmpl.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ABA 3: EDITAR CADASTRO & NOTAS */}
          {activeTab === 'cadastro' && (
            <form onSubmit={handleSave} className="space-y-3.5 font-mono">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-lg text-xs font-sans text-stone-900 focus:bg-white focus:border-amber-400 focus:outline-none"
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  Telefone / WhatsApp (Identificador do Cliente)
                </label>
                <input
                  type="text"
                  disabled
                  value={customer.formattedPhone}
                  className="w-full h-9 px-3 bg-stone-100 border border-stone-200 rounded-lg text-xs text-stone-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">O telefone é a chave única do cliente para vincular pedidos e histórico.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  Endereço de Entrega Principal
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-lg text-xs font-sans text-stone-900 focus:bg-white focus:border-amber-400 focus:outline-none"
                  placeholder="Ex: Rua das Flores, 123 - Apto 4B"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                  Observações Internas / Preferências do Cliente
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs font-sans text-stone-900 focus:bg-white focus:border-amber-400 focus:outline-none resize-none"
                  placeholder="Ex: Prefere massa bem assada, não consome cebola, costuma pedir aos sábados, cliente amigo da família..."
                />
              </div>

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Ficha e notas atualizadas com sucesso!</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-10 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
