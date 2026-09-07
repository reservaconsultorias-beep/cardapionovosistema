import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, X, ArrowUpDown, Award, ShoppingBag, ChevronDown } from 'lucide-react';
import PeriodFilterCompact, { PeriodFilterOption } from './PeriodFilterCompact';

export default function CustomersManager() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Filtros de Período e Ordenação
  const [period, setPeriod] = useState<PeriodFilterOption>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'spent' | 'orders'>('recent');

  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('last_order_at', { ascending: false });
    if (!error && data) setCustomers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openHistory = async (customer: any) => {
    setSelectedCustomer(customer);
    setLoadingOrders(true);
    const { data } = await supabase
      .from('orders')
      .select('id, status, total_amount, order_type, created_at, items')
      .eq('customer_phone', customer.phone)
      .order('created_at', { ascending: false });
    setCustomerOrders(data || []);
    setLoadingOrders(false);
  };

  const filtered = customers.filter(c => {
    const matchesSearch = 
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search);
    if (!matchesSearch) return false;

    if (period === 'todos') return true;
    if (!c.last_order_at) return false;

    const orderDate = new Date(c.last_order_at);
    const now = new Date();

    if (period === 'hoje') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      return orderDate >= todayStart;
    }
    if (period === 'ontem') {
      const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      return orderDate >= yStart && orderDate <= yEnd;
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
      const mStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      return orderDate >= mStart;
    }
    if (period === 'mes_passado') {
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return orderDate >= prevStart && orderDate <= prevEnd;
    }
    if (period === 'customizado' && startDate && endDate) {
      const cStart = new Date(startDate + 'T00:00:00');
      const cEnd = new Date(endDate + 'T23:59:59.999');
      return orderDate >= cStart && orderDate <= cEnd;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'spent') {
      return Number(b.total_spent || 0) - Number(a.total_spent || 0);
    }
    if (sortBy === 'orders') {
      return Number(b.total_orders || 0) - Number(a.total_orders || 0);
    }
    return new Date(b.last_order_at || 0).getTime() - new Date(a.last_order_at || 0).getTime();
  });

  if (loading) return <div className="p-8 text-center text-[#78716C] font-medium">Carregando dados dos clientes...</div>;

  return (
    <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
            {filtered.length} {filtered.length === 1 ? 'cliente encontrado' : 'clientes cadastrados'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Busca por texto */}
          <div className="relative flex-1 sm:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="h-7 pl-8 pr-3 bg-white border border-stone-200 rounded-lg text-[11px] font-mono text-stone-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 w-full shadow-2xs"
            />
          </div>

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

          {/* Ordenação — Dropdown limpo igual ao filtro de período */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'spent' | 'orders')}
              className="h-7 pl-2 pr-7 border border-stone-200 hover:border-stone-300 bg-white text-stone-700 rounded-lg text-[11px] font-mono font-medium appearance-none cursor-pointer shadow-2xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
            >
              <option value="recent">Recente</option>
              <option value="spent">+ Valor</option>
              <option value="orders">+ Pedidos</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E7E5E1] text-xs font-semibold uppercase tracking-wide text-[#A8A29E] bg-[#FAFAF9]">
              <th className="py-3.5 px-4 rounded-tl-lg">Cliente</th>
              <th className="py-3.5 px-4">Telefone</th>
              <th className="py-3.5 px-4 text-center">Pedidos</th>
              <th className="py-3.5 px-4">Total Gasto</th>
              <th className="py-3.5 px-4 rounded-tr-lg">Última Compra</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#78716C]">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openHistory(c)}
                  className="border-b border-[#F0EFED] hover:bg-[#FAFAF9] transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1C1917]">{c.name || 'Sem nome'}</span>
                      {Number(c.total_orders) >= 5 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          <Award size={11} className="text-amber-600" /> VIP
                        </span>
                      )}
                      {Number(c.total_orders) === 1 && (
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200">
                          1º Pedido
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#78716C] font-mono tabular-nums">{c.phone}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-[#1C1917] bg-[#FAFAF9] border border-[#E7E5E1] px-2.5 py-0.5 rounded font-mono tabular-nums text-xs font-bold">
                      {c.total_orders}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold font-mono tabular-nums text-[#1C1917]">€{Number(c.total_spent).toFixed(2)}</td>
                  <td className="py-3.5 px-4 text-[#78716C] font-mono tabular-nums">
                    {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('pt-PT') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <CustomerModal 
          customer={selectedCustomer} 
          orders={customerOrders} 
          loadingOrders={loadingOrders}
          onClose={() => setSelectedCustomer(null)} 
          onSave={async (updatedData) => {
            const { error } = await supabase
              .from('customers')
              .update(updatedData)
              .eq('id', selectedCustomer.id);
            if (!error) {
              setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, ...updatedData } : c));
              setSelectedCustomer({ ...selectedCustomer, ...updatedData });
            }
          }}
        />
      )}
    </div>
  );
}

function CustomerModal({ customer, orders, loadingOrders, onClose, onSave }: any) {
  const [activeTab, setActiveTab] = useState<'history' | 'edit'>('history');
  
  // Edit form state
  const [formData, setFormData] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    address: customer.address || '',
    notes: customer.notes || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-[#E7E5E1] overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-[#E7E5E1] flex justify-between items-start bg-[#FAFAF9] flex-shrink-0">
          <div>
            <h3 className="font-bold text-lg text-[#1C1917]">{customer.name || 'Sem nome'}</h3>
            <p className="text-sm font-mono text-[#78716C]">{customer.phone}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#E7E5E1] rounded-full text-[#A8A29E] hover:text-[#1C1917] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-white">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-xs font-bold font-mono tracking-wide border-b-2 transition-colors ${
              activeTab === 'history' ? 'border-amber-500 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            HISTÓRICO DE PEDIDOS
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-3 text-xs font-bold font-mono tracking-wide border-b-2 transition-colors ${
              activeTab === 'edit' ? 'border-amber-500 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            EDITAR CADASTRO
          </button>
        </div>

        <div className="p-5 overflow-y-auto bg-white">
          {activeTab === 'history' ? (
            <>
              {loadingOrders ? (
                <div className="text-center text-[#78716C] py-6">Carregando...</div>
              ) : orders.length === 0 ? (
                <div className="text-center text-[#78716C] py-6">Nenhum pedido encontrado.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {orders.map((o: any) => (
                    <div key={o.id} className="p-3.5 rounded-lg border border-[#E7E5E1] bg-[#FAFAF9]">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-[#1C1917] font-mono">Pedido #{o.id}</span>
                        <span className="text-[#C81E3A] font-bold font-mono tabular-nums text-sm">€{Number(o.total_amount).toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-[#78716C] mt-1 font-mono">
                        {new Date(o.created_at).toLocaleString('pt-PT')} · {o.order_type} · {o.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold font-mono text-stone-500 uppercase tracking-wider mb-1.5">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
                  placeholder="Ex: João Silva"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold font-mono text-stone-500 uppercase tracking-wider mb-1.5">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-lg text-sm font-mono text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
                  placeholder="Ex: 351900000000"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold font-mono text-stone-500 uppercase tracking-wider mb-1.5">
                  Endereço de Entrega Padrão
                </label>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 resize-none"
                  placeholder="Ex: Rua das Flores, 123 - Apto 4"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold font-mono text-stone-500 uppercase tracking-wider mb-1.5">
                  Observações / Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 resize-none"
                  placeholder="Ex: Cliente prefere a pizza bem assada..."
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full h-10 bg-[#1C1917] hover:bg-[#292524] text-white font-bold font-mono text-xs uppercase tracking-wide rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
