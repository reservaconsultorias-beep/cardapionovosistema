import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

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
    const { error } = await supabase.from('categories').upsert(editingCat, { onConflict: 'id' });
    if (error) setFeedback("Erro: " + error.message);
    else {
      setFeedback("Salvo com sucesso!");
      setIsModalOpen(false);
      loadData();
    }
    setTimeout(() => setFeedback(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Tem certeza que deseja excluir esta categoria? Os produtos atrelados a ela podem sumir do app.")) return;
    setFeedback("Excluindo...");
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if(error) setFeedback("Erro: " + error.message);
    else { setFeedback("Excluído!"); loadData(); }
    setTimeout(() => setFeedback(""), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)]">
        <div>
          <h3 className="font-bold text-xl text-[#1C1917]">Categorias</h3>
          <p className="text-xs text-[#78716C] mt-0.5">Gerencie as seções do seu cardápio ({categories.length} cadastradas)</p>
        </div>
        <button onClick={() => { setEditingCat({ id: '', name: '', order_index: categories.length + 1 }); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#C81E3A] hover:bg-[#A8172F] text-white rounded-lg text-sm font-semibold transition-all duration-200 active:scale-95 shadow-sm cursor-pointer">
          <Plus size={16}/> Nova Categoria
        </button>
      </div>
      
      {feedback && <div className="p-3 bg-[#EFF6FF] text-[#1D4ED8] rounded-lg text-sm border border-[#BFDBFE]">{feedback}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white border border-[#E7E5E1] p-4.5 rounded-xl flex items-center justify-between shadow-[0_1px_2px_rgba(28,25,23,0.04)] hover:shadow-md transition-all">
            <div>
              <div className="font-bold text-[#1C1917]">{cat.name}</div>
              <div className="text-xs text-[#78716C] font-mono">Ordem: {cat.order_index} | ID: {cat.id}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditingCat(cat); setIsModalOpen(true); }} className="p-1.5 text-[#78716C] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] rounded-lg transition-colors"><Edit2 size={16}/></button>
              <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingCat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border border-[#E7E5E1] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#E7E5E1]">
              <h3 className="font-bold text-lg text-[#1C1917]">{editingCat.id && categories.find(c=>c.id === editingCat.id) ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-[#A8A29E] hover:text-[#1C1917] p-1"><X size={20}/></button>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">ID da Categoria (sem espaços)</label>
              <input required type="text" value={editingCat.id} onChange={e => setEditingCat({...editingCat, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})} disabled={!!categories.find(c=>c.id === editingCat.id)} className="w-full p-2.5 bg-[#FAFAF9] border border-[#E7E5E1] rounded-lg font-mono text-sm focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20" placeholder="ex: doces"/>
              <p className="text-xs text-[#78716C]">Este ID é usado pelo sistema. Não pode ser alterado depois.</p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Nome Exibido</label>
              <input required type="text" value={editingCat.name} onChange={e => setEditingCat({...editingCat, name: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20" placeholder="ex: Doces Finos"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Ordem de Exibição</label>
              <input required type="number" value={editingCat.order_index} onChange={e => setEditingCat({...editingCat, order_index: parseInt(e.target.value)})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg font-mono text-sm text-[#1C1917] focus:outline-none focus:border-[#C81E3A] focus:ring-1 focus:ring-[#C81E3A]/20" />
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full bg-[#C81E3A] text-white py-2.5 rounded-lg font-semibold hover:bg-[#A8172F] transition-colors shadow-sm">Salvar Categoria</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
