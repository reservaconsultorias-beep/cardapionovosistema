import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, X, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react';

export default function CategoryManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase.from('categories').select('*').order('order_index');
    if (data) setCategories(data);
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("Salvando...");
    const payload = {
      ...editingCat,
      display_group: editingCat.display_group || null,
    };
    const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'id' });
    if (error) setFeedback("Erro: " + error.message);
    else {
      setFeedback("Salvo com sucesso!");
      setIsModalOpen(false);
      loadData();
    }
    setTimeout(() => setFeedback(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Tem certeza que deseja excluir esta categoria? Os produtos atrelados a ela podem sumir do app. Considere apenas desativar, em vez de excluir.")) return;
    setFeedback("Excluindo...");
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if(error) setFeedback("Erro: " + error.message);
    else { setFeedback("Excluído!"); loadData(); }
    setTimeout(() => setFeedback(""), 3000);
  };

  const handleToggleActive = async (cat: any) => {
    const { error } = await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    if (!error) loadData();
  };

  const handleMove = async (cat: any, direction: 'up' | 'down') => {
    const idx = categories.findIndex(c => c.id === cat.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const neighbor = categories[swapIdx];
    setFeedback("Reordenando...");
    await Promise.all([
      supabase.from('categories').update({ order_index: neighbor.order_index }).eq('id', cat.id),
      supabase.from('categories').update({ order_index: cat.order_index }).eq('id', neighbor.id),
    ]);
    setFeedback("");
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)]">
        <div>
          <h3 className="font-bold text-xl text-[#1C1917]">Categorias</h3>
          <p className="text-xs text-[#78716C] mt-0.5">Gerencie as seções do seu cardápio ({categories.length} cadastradas)</p>
        </div>
        <button onClick={() => { setEditingCat({ id: '', name: '', order_index: categories.length + 1, display_label: '', display_sub: '', display_group: '', icon: '', is_active: true }); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#C81E3A] hover:bg-[#A8172F] text-white rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer">
          <Plus size={16}/> Nova Categoria
        </button>
      </div>

      {feedback && <div className="p-3 bg-[#EFF6FF] text-[#1D4ED8] rounded-lg text-sm border border-[#BFDBFE]">{feedback}</div>}

      <div className="bg-white border border-[#E7E5E1] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        {categories.map((cat, idx) => (
          <div key={cat.id} className={`flex items-center justify-between p-4 ${idx !== categories.length - 1 ? 'border-b border-[#F0EFED]' : ''} ${!cat.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <button type="button" onClick={() => handleMove(cat, 'up')} disabled={idx === 0} className="text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-30 disabled:cursor-not-allowed">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => handleMove(cat, 'down')} disabled={idx === categories.length - 1} className="text-[#A8A29E] hover:text-[#1C1917] disabled:opacity-30 disabled:cursor-not-allowed">
                  <ArrowDown size={14} />
                </button>
              </div>
              <div>
                <div className="font-bold text-[#1C1917] flex items-center gap-2">
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.display_label || cat.name}
                  {!cat.is_active && <span className="text-[10px] font-semibold uppercase tracking-wide bg-[#F0EFED] text-[#78716C] px-2 py-0.5 rounded-full">Desativada</span>}
                </div>
                <div className="text-xs text-[#78716C] font-mono mt-0.5">
                  ID: {cat.id}{cat.display_group ? ` · Agrupada em: ${cat.display_group}` : ''}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleToggleActive(cat)} className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAFAF9] rounded-lg transition-colors" title={cat.is_active ? 'Desativar' : 'Ativar'}>
                {cat.is_active ? <Eye size={16}/> : <EyeOff size={16}/>}
              </button>
              <button onClick={() => { setEditingCat(cat); setIsModalOpen(true); }} className="p-1.5 text-[#78716C] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] rounded-lg transition-colors"><Edit2 size={16}/></button>
              <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingCat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border border-[#E7E5E1] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-[#E7E5E1]">
              <h3 className="font-bold text-lg text-[#1C1917]">{categories.find(c=>c.id === editingCat.id) ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-[#A8A29E] hover:text-[#1C1917] p-1"><X size={20}/></button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">ID da Categoria (sem espaços)</label>
              <input required type="text" value={editingCat.id} onChange={e => setEditingCat({...editingCat, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})} disabled={!!categories.find(c=>c.id === editingCat.id)} className="w-full p-2.5 bg-[#FAFAF9] border border-[#E7E5E1] rounded-lg font-mono text-sm focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20" placeholder="ex: doces"/>
              <p className="text-xs text-[#78716C]">Este ID é usado pelo sistema. Não pode ser alterado depois.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Nome Interno</label>
              <input required type="text" value={editingCat.name} onChange={e => setEditingCat({...editingCat, name: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20" placeholder="ex: Doces Finos"/>
              <p className="text-xs text-[#78716C]">Usado internamente no painel. Pode ser simples.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Ícone (emoji, opcional)</label>
              <input type="text" value={editingCat.icon || ''} onChange={e => setEditingCat({...editingCat, icon: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20" placeholder="🍕"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Rótulo Exibido no Cardápio</label>
              <input type="text" value={editingCat.display_label || ''} onChange={e => setEditingCat({...editingCat, display_label: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20" placeholder="ex: TRADICIONAIS 🍕"/>
              <p className="text-xs text-[#78716C]">Se vazio, usa o Nome Interno.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Subtítulo</label>
              <input type="text" value={editingCat.display_sub || ''} onChange={e => setEditingCat({...editingCat, display_sub: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20" placeholder="ex: Clássicas de sempre"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Agrupar sob outra aba</label>
              <select value={editingCat.display_group || ''} onChange={e => setEditingCat({...editingCat, display_group: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20">
                <option value="">— Aba própria —</option>
                {categories.filter(c => c.id !== editingCat.id).map(c => (
                  <option key={c.id} value={c.id}>{c.display_label || c.name}</option>
                ))}
              </select>
              <p className="text-xs text-[#78716C]">Ex: 3 categorias de esfihas podem aparecer juntas sob uma aba "Esfihas".</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Ordem de Exibição</label>
              <input required type="number" value={editingCat.order_index} onChange={e => setEditingCat({...editingCat, order_index: parseInt(e.target.value)})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg font-mono text-sm text-[#1C1917] focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20" />
            </div>

            <label className="flex items-center gap-2 text-sm text-[#1C1917] font-medium">
              <input type="checkbox" checked={editingCat.is_active !== false} onChange={e => setEditingCat({...editingCat, is_active: e.target.checked})} className="w-4 h-4 accent-[#C81E3A] rounded" />
              Categoria ativa (visível no cardápio)
            </label>

            <div className="pt-2">
              <button type="submit" className="w-full bg-[#C81E3A] text-white py-2.5 rounded-lg font-semibold hover:bg-[#A8172F] transition-colors shadow-sm">Salvar Categoria</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
