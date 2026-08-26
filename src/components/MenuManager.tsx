import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MenuItem, ALL_MENU_ITEMS } from '../data/menu';
import { Plus, Edit2, Trash2, Save, X, Image as ImageIcon } from 'lucide-react';

export default function MenuManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [feedback, setFeedback] = useState("");
  const [pausedItems, setPausedItems] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout ao carregar dados do banco")), 15000));
      const [catsResult, itemsResult, pausedResult] = await Promise.race([
        Promise.all([
          supabase.from('categories').select('*').neq('id', 'system_config').order('order_index'),
          supabase.from('menu_items').select('*').neq('category', 'system_config').order('id'),
          supabase.from('paused_items').select('id')
        ]),
        timeout
      ]) as [any, any, any];

      const [cats, menuItems, paused] = catsResult && itemsResult ? [catsResult.data, itemsResult.data, pausedResult.data] : [null, null, null];

      if (catsResult.error) console.error("Erro ao carregar categorias:", catsResult.error);
      if (itemsResult.error) console.error("Erro ao carregar produtos:", itemsResult.error);
      if (cats) setCategories(cats);
      if (menuItems) setItems(menuItems);
      if (paused) setPausedItems(paused.map((p: any) => p.id));
    } catch (err: any) {
      console.error("Falha ao carregar cardápio:", err);
      setFeedback("Erro ao carregar produtos: " + (err?.message || String(err)) + ". Verifique sua conexão e tente novamente.");
      setTimeout(() => setFeedback(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMigrate = async () => {
    setFeedback("Iniciando migração... Por favor aguarde.");
    
    // Insert categories first
    const predefinedCategories = [
      { id: 'promocoes', name: 'PROMOÇÃO DO DIA', order_index: 1 },
      { id: 'pizzas', name: 'Pizzas', order_index: 2 },
      { id: 'esfihas-salgadas-tradicionais', name: 'Esfihas Salgadas Tradicionais', order_index: 3 },
      { id: 'esfihas-salgadas-especiais', name: 'Esfihas Salgadas Especiais', order_index: 4 },
      { id: 'esfihas-doces', name: 'Esfihas Doces', order_index: 5 },
      { id: 'bebidas', name: 'Bebidas', order_index: 6 },
      { id: 'bordas', name: 'Bordas', order_index: 7 }
    ];

    for (const cat of predefinedCategories) {
      await supabase.from('categories').upsert(cat, { onConflict: 'id' });
    }

    // Insert items
    for (const item of ALL_MENU_ITEMS) {
      // mapping some specific categories that were grouped in menu.ts
      let catId = item.category;
      if (item.category === 'tradicionais' || item.category === 'especiais' || item.category === 'gourmet' || item.category === 'doces') {
        catId = 'pizzas'; 
      }
      
      let finalImg = item.imageUrl === 'none' ? null : item.imageUrl;
      if (finalImg && finalImg.startsWith('/')) {
        /* no op */
      } else if (finalImg && !finalImg.startsWith('http')) {
        /* no op */
      }

      const dbItem = {
        id: item.id,
        name: item.name,
        ingredients: item.ingredients || '',
        category: item.category,
        price_single: item.priceSingle || null,
        price_p: item.priceP || null,
        price_m: item.priceM || null,
        price_g: item.priceG || null,
        image_url: finalImg,
        day_of_week: item.dayOfWeek || null
      };
      
      // Ensure category exists
      const catExists = predefinedCategories.find(c => c.id === item.category) || ['tradicionais', 'especiais', 'gourmet', 'doces'].includes(item.category);
      if (['tradicionais', 'especiais', 'gourmet', 'doces'].includes(item.category)) {
          await supabase.from('categories').upsert({ id: item.category, name: 'Pizzas ' + item.category, order_index: 3 }, { onConflict: 'id' });
      }

      await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
    }
    
    setFeedback("Migração concluída com sucesso!");
    loadData();
  };


  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setFeedback("Fazendo upload da imagem...");
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `41menus/produtos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('Cardapio41menus')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('Cardapio41menus')
        .getPublicUrl(filePath);

      setEditingItem({ ...editingItem, image_url: data.publicUrl });
      setFeedback("Upload de imagem concluído com sucesso!");
    } catch (error: any) {
      console.error(error);
      setFeedback("Erro no upload (certifique-se de que criou um bucket 'Cardapio41menus' público no Supabase): " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("Salvando...");
    
    let finalImageUrl = editingItem.image_url || null;
    if (finalImageUrl && !finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('/')) {
      // É só um nome de arquivo solto (veio do Storage do Supabase), então montamos a URL pública.
      finalImageUrl = `https://tipnhvpivhaerumetona.supabase.co/storage/v1/object/public/Cardapio41menus/${finalImageUrl}`;
    }

    const dbItem = {
      id: editingItem.id || `item-${Date.now()}`,
      name: editingItem.name,
      ingredients: editingItem.ingredients,
      category: editingItem.category,
      price_single: editingItem.price_single || null,
      price_p: editingItem.price_p || null,
      price_m: editingItem.price_m || null,
      price_g: editingItem.price_g || null,
      image_url: finalImageUrl,
      day_of_week: editingItem.day_of_week || null
    };

    const { error } = await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
    
    if (error) {
      setFeedback("Erro ao salvar: " + error.message);
    } else {
      setFeedback("Salvo com sucesso!");
      setIsModalOpen(false);
      loadData();
    }
    
    setTimeout(() => setFeedback(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este item?")) {
      await supabase.from('menu_items').delete().eq('id', id);
      loadData();
    }
  };

  const togglePauseItem = async (itemId: string) => {
    const isPaused = pausedItems.includes(itemId);
    try {
      if (isPaused) {
        setPausedItems(prev => prev.filter(id => id !== itemId));
        await supabase.from('paused_items').delete().eq('id', itemId);
      } else {
        setPausedItems(prev => [...prev, itemId]);
        await supabase.from('paused_items').upsert({ id: itemId }, { onConflict: 'id' });
      }
    } catch(e) {
      console.error(e);
      loadData(); // revert on error
    }
  };

  const handleQuickPriceEdit = async (itemId: string, field: string, value: string) => {
    const numVal = parseFloat(value.replace(',', '.'));
    if(isNaN(numVal)) return;

    try {
      // Optimistic UI update
      setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: numVal } : item));
      const { error } = await supabase.from('menu_items').update({ [field]: numVal }).eq('id', itemId);
      if(error) throw error;
    } catch(e) {
      console.error(e);
      loadData(); // revert on error
    }
  };

  const openNewModal = () => {
    setEditingItem({
      id: `item-${Date.now()}`,
      name: '',
      ingredients: '',
      category: categories[0]?.id || '',
      price_single: '',
      image_url: ''
    });
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center">Carregando dados do banco...</div>;

  const filteredItems = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);

  return (
    <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1C1917]">Gerenciar Cardápio</h2>
          <p className="text-sm text-[#78716C]">Controle total sobre seus produtos e categorias.</p>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <button onClick={handleMigrate} className="px-4 py-2.5 bg-amber-600 text-white rounded-lg font-semibold text-sm hover:bg-amber-700 transition-colors">
              Puxar Cardápio Inicial (Migrar)
            </button>
          )}
          <button onClick={openNewModal} className="px-4 py-2.5 bg-[#C81E3A] text-white rounded-lg font-semibold text-sm hover:bg-[#A8172F] transition-colors flex items-center gap-2">
            <Plus size={16} /> Novo Produto
          </button>
        </div>
      </div>

      {feedback && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
          {feedback}
        </div>
      )}

      {/* Category Filter */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-6">
        <button 
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeCategory === 'all' ? 'bg-[#1C1917] text-[#D4AF6A] shadow-md' : 'bg-[#FAFAF9] text-[#78716C] border border-[#E7E5E1] hover:bg-gray-100'}`}
        >
          Todos os Produtos
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeCategory === cat.id ? 'bg-[#1C1917] text-[#D4AF6A] shadow-md' : 'bg-[#FAFAF9] text-[#78716C] border border-[#E7E5E1] hover:bg-gray-100'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items Table (Quick Edit) */}
      <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAFAF9] border-b border-[#E7E5E1] text-[11px] font-mono font-bold text-[#78716C] uppercase tracking-wider">
              <th className="py-3 px-4">Produto</th>
              <th className="py-3 px-4">Preço(s)</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFED] text-sm">
            {filteredItems.map(item => {
              const isPaused = pausedItems.includes(item.id);
              
              return (
                <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden shrink-0 border border-stone-200">
                        {item.image_url ? (
                          <img src={item.image_url.startsWith('http') ? item.image_url : (item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-stone-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-[#1C1917] line-clamp-1">{item.name}</div>
                        <span className="text-[10px] uppercase font-mono font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                          {categories.find(c => c.id === item.category)?.name || item.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {item.price_single !== null ? (
                      <div className="flex items-center gap-1">
                        <span className="text-stone-500 font-mono">€</span>
                        <input 
                          type="text" 
                          defaultValue={item.price_single}
                          onBlur={(e) => handleQuickPriceEdit(item.id, 'price_single', e.target.value)}
                          className="w-16 px-2 py-1 text-sm font-mono font-bold border border-stone-200 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-stone-400">Peq</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-stone-400 font-mono text-xs">€</span>
                            <input type="text" defaultValue={item.price_p} onBlur={(e) => handleQuickPriceEdit(item.id, 'price_p', e.target.value)} className="w-12 px-1.5 py-0.5 text-xs font-mono font-bold border border-stone-200 rounded-md outline-none focus:border-amber-500" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-stone-400">Méd</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-stone-400 font-mono text-xs">€</span>
                            <input type="text" defaultValue={item.price_m} onBlur={(e) => handleQuickPriceEdit(item.id, 'price_m', e.target.value)} className="w-12 px-1.5 py-0.5 text-xs font-mono font-bold border border-stone-200 rounded-md outline-none focus:border-amber-500" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-stone-400">Grd</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-stone-400 font-mono text-xs">€</span>
                            <input type="text" defaultValue={item.price_g} onBlur={(e) => handleQuickPriceEdit(item.id, 'price_g', e.target.value)} className="w-12 px-1.5 py-0.5 text-xs font-mono font-bold border border-stone-200 rounded-md outline-none focus:border-amber-500" />
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePauseItem(item.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${!isPaused ? 'bg-emerald-500' : 'bg-stone-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isPaused ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div className={`text-[10px] font-mono font-bold mt-1 ${isPaused ? 'text-red-500' : 'text-emerald-600'}`}>
                      {isPaused ? 'PAUSADO' : 'ATIVO'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Editar Completo">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
         <div className="text-center py-12 text-gray-500">
           Nenhum produto cadastrado no banco de dados ainda. <br/>
           Clique em "Puxar Cardápio Inicial" para importar os dados do código.
         </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-stone-50 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-800">
            <div className="sticky top-0 bg-stone-950 p-4 sm:p-5 flex justify-between items-center z-10 border-b border-stone-800">
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                {editingItem.id.startsWith('item-') && !editingItem.name ? 'Novo Produto' : 'Editar Produto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-stone-400 hover:text-white bg-stone-900 hover:bg-rose-600 rounded-md transition-colors border border-stone-800 hover:border-rose-500">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">ID (Código)</label>
                  <input required type="text" value={editingItem.id} onChange={e => setEditingItem({...editingItem, id: e.target.value})} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors" disabled={!editingItem.id.startsWith('item-')} />
                  <p className="text-[10px] text-stone-400 font-mono mt-1">Ex: p-1 para Pizza 1</p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Categoria</label>
                  <select required value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors cursor-pointer">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Nome do Produto</label>
                <input required type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors" placeholder="Ex: 61 - Bacon" />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Ingredientes / Descrição</label>
                <textarea rows={3} value={editingItem.ingredients} onChange={e => setEditingItem({...editingItem, ingredients: e.target.value})} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors resize-y" placeholder="Lista de ingredientes..."></textarea>
              </div>

              
              <div className="space-y-3 bg-stone-50 p-4 rounded-md border border-stone-200">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Imagem do Produto</label>
                
                {editingItem.image_url && (
                  <div className="w-full h-40 rounded-md overflow-hidden border border-stone-200 bg-white mb-3 flex items-center justify-center p-2 relative shadow-sm">
                    <img 
                      src={editingItem.image_url.startsWith('http') ? editingItem.image_url : (editingItem.image_url.startsWith('/') ? editingItem.image_url : '/' + editingItem.image_url)} 
                      alt="Preview proporcional" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                )}

                <div className="flex gap-3 items-center">
                  <input type="text" value={editingItem.image_url || ''} onChange={e => setEditingItem({...editingItem, image_url: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-stone-900 transition-colors" placeholder="URL da imagem (ou faça o upload abaixo)" />
                </div>
                
                <div className="pt-2 border-t border-stone-200 mt-3">
                  <label className="block text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-2">Upload do Computador</label>
                  <input 
                    type="file" 
                    accept="image/jpeg, image/png, image/webp" 
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="block w-full text-sm text-stone-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-bold
                      file:bg-stone-900 file:text-white
                      hover:file:bg-stone-950 hover:file:cursor-pointer
                      cursor-pointer border border-stone-200 rounded-md bg-white p-1"
                  />
                  <p className="text-[10px] font-mono text-stone-400 mt-2">Formatos: JPG, PNG, WEBP.</p>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-5">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider mb-3">Preços (Deixe em branco se não se aplicar)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">Único (€)</label>
                    <input type="number" step="0.01" value={editingItem.price_single || ''} onChange={e => setEditingItem({...editingItem, price_single: e.target.value})} className="w-full px-3 py-2.5 bg-emerald-50/30 border border-emerald-200 rounded-md text-sm font-extrabold text-emerald-900 outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Pizzas (P)</label>
                    <input type="number" step="0.01" value={editingItem.price_p || ''} onChange={e => setEditingItem({...editingItem, price_p: e.target.value})} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-extrabold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Pizzas (M)</label>
                    <input type="number" step="0.01" value={editingItem.price_m || ''} onChange={e => setEditingItem({...editingItem, price_m: e.target.value})} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-extrabold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Pizzas (G)</label>
                    <input type="number" step="0.01" value={editingItem.price_g || ''} onChange={e => setEditingItem({...editingItem, price_g: e.target.value})} className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-extrabold text-stone-900 outline-none focus:border-stone-900 focus:bg-white transition-colors" />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-md font-bold text-sm bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer border border-stone-200">
                  Cancelar
                </button>
                <button type="submit" className="px-8 py-3 rounded-md font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:translate-y-px cursor-pointer flex items-center gap-2 border border-rose-700">
                  <Save size={16} /> Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
