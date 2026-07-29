import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, X } from 'lucide-react';

export default function CustomersManager() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

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

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  if (loading) return <div className="p-8 text-center text-[#78716C] font-medium">Carregando dados dos clientes...</div>;

  return (
    <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1C1917]">Clientes</h2>
          <p className="text-sm text-[#78716C]">Histórico e cadastro de todos os clientes que já compraram.</p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-9 pr-4 py-2.5 bg-[#FAFAF9] border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20 w-full sm:w-64"
          />
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
                  <td className="py-3.5 px-4 font-medium text-[#1C1917]">{c.name || 'Sem nome'}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-[#E7E5E1] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#E7E5E1] flex justify-between items-center bg-[#FAFAF9] flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg text-[#1C1917]">{selectedCustomer.name || 'Sem nome'}</h3>
                <p className="text-sm font-mono text-[#78716C]">{selectedCustomer.phone}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-[#E7E5E1] rounded-full text-[#A8A29E] hover:text-[#1C1917] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <h4 className="font-bold mb-3 text-xs uppercase tracking-wide text-[#A8A29E]">Histórico de Pedidos</h4>
              {loadingOrders ? (
                <div className="text-center text-[#78716C] py-6">Carregando...</div>
              ) : customerOrders.length === 0 ? (
                <div className="text-center text-[#78716C] py-6">Nenhum pedido encontrado.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {customerOrders.map((o) => (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
