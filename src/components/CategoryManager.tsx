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
      <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-gray-200/80 shadow-md">
        <h3 className="font-bold text-gray-800">Categorias ({categories.length})</h3>
        <button onClick={() => { setEditingCat({ id: '', name: '', order_index: categories.length + 1 }); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 transition-colors">
          <Plus size={16}/> Nova Categoria
        </button>
      </div>
      
      {feedback && <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">{feedback}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white border border-gray-200 p-4.5 rounded-xl flex items-center justify-between shadow-md hover:shadow-lg hover:border-gray-300 transition-all">
            <div>
              <div className="font-bold">{cat.name}</div>
              <div className="text-xs text-gray-500">Ordem: {cat.order_index} | ID: {cat.id}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditingCat(cat); setIsModalOpen(true); }} className="text-gray-400 hover:text-[#ea1d2c]"><Edit2 size={16}/></button>
              <button onClick={() => handleDelete(cat.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && editingCat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingCat.id && categories.find(c=>c.id === editingCat.id) ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">ID da Categoria (sem espaços)</label>
              <input required type="text" value={editingCat.id} onChange={e => setEditingCat({...editingCat, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})} disabled={!!categories.find(c=>c.id === editingCat.id)} className="w-full p-2.5 bg-gray-50 border rounded-lg" placeholder="ex: doces"/>
              <p className="text-xs text-gray-500">Este ID é usado pelo sistema. Não pode ser alterado depois.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome Exibido</label>
              <input required type="text" value={editingCat.name} onChange={e => setEditingCat({...editingCat, name: e.target.value})} className="w-full p-2.5 bg-gray-50 border rounded-lg" placeholder="ex: Doces Finos"/>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ordem de Exibição</label>
              <input required type="number" value={editingCat.order_index} onChange={e => setEditingCat({...editingCat, order_index: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-lg" />
            </div>

            <button type="submit" className="w-full bg-[#ea1d2c] text-white py-3 rounded-xl font-bold hover:bg-[#c91825]">Salvar Categoria</button>
          </form>
        </div>
      )}
    </div>
  );
}
