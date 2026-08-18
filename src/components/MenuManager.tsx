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

  const loadData = async () => {
    setLoading(true);
    const { data: cats } = await supabase.from('categories').select('*').order('order_index');
    const { data: menuItems } = await supabase.from('menu_items').select('*').order('id');
    if (cats) setCategories(cats);
    if (menuItems) setItems(menuItems);
    setLoading(false);
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
          className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeCategory === 'all' ? 'bg-[#1C1917] text-[#D4AF6A] shadow-md border-b-2 border-[#D4AF6A]' : 'bg-[#FAFAF9] text-[#78716C] border border-[#E7E5E1] hover:bg-gray-100'}`}
        >
          Todos os Produtos
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeCategory === cat.id ? 'bg-[#1C1917] text-[#D4AF6A] shadow-md border-b-2 border-[#D4AF6A]' : 'bg-[#FAFAF9] text-[#78716C] border border-[#E7E5E1] hover:bg-gray-100'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredItems.map(item => (
          <div key={item.id} className="border border-[#E7E5E1] bg-white rounded-xl p-4 flex flex-col justify-between shadow-[0_1px_2px_rgba(28,25,23,0.04)] hover:shadow-md transition-all overflow-hidden">
            <div>
              {/* Featured Proportional Product Image */}
              <div className="w-full h-36 rounded-lg overflow-hidden bg-[#FAFAF9] border border-[#E7E5E1] mb-3 flex items-center justify-center p-1 relative group">
                {item.image_url ? (
                  <img 
                    src={item.image_url.startsWith('http') ? item.image_url : (item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url)} 
                    alt={item.name} 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#A8A29E] bg-[#FAFAF9]">
                    <ImageIcon size={32} className="text-[#A8A29E]" />
                    <span className="text-xs mt-1 font-medium text-[#A8A29E]">Sem foto</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-[#1C1917] text-base leading-tight line-clamp-2">{item.name}</h3>
                <div className="flex gap-1 ml-2 shrink-0">
                  <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1.5 text-[#78716C] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] rounded-lg transition-colors" title="Editar">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <span className="inline-block px-2 py-0.5 bg-[#FAFAF9] text-[#78716C] border border-[#E7E5E1] text-xs rounded-md mb-2 font-medium">{categories.find(c => c.id === item.category)?.name || item.category}</span>
              <p className="text-xs text-[#78716C] line-clamp-2 mb-3">{item.ingredients}</p>
            </div>
            
            <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#F0EFED]">
              <div className="font-bold font-mono tabular-nums text-[#1C1917]">
                {item.price_single ? `€${Number(item.price_single).toFixed(2)}` : (item.price_p ? `A partir de €${Number(item.price_p).toFixed(2)}` : 'Preço variável')}
              </div>
              <button 
                onClick={() => { setEditingItem(item); setIsModalOpen(true); }} 
                className="px-3 py-1.5 text-xs font-bold text-[#1D4ED8] bg-[#EFF6FF] hover:bg-blue-100 rounded-lg transition-colors"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
         <div className="text-center py-12 text-gray-500">
           Nenhum produto cadastrado no banco de dados ainda. <br/>
           Clique em "Puxar Cardápio Inicial" para importar os dados do código.
         </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && editingItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 sm:p-6 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem.id.startsWith('item-') && !editingItem.name ? 'Novo Produto' : 'Editar Produto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">ID (Código)</label>
                  <input required type="text" value={editingItem.id} onChange={e => setEditingItem({...editingItem, id: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" disabled={!editingItem.id.startsWith('item-')} />
                  <p className="text-xs text-gray-500">Ex: p-1 para Pizza 1, e-61 para Esfiha 61</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Categoria</label>
                  <select required value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nome do Produto</label>
                <input required type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="Ex: 61 - Bacon" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Ingredientes / Descrição</label>
                <textarea rows={3} value={editingItem.ingredients} onChange={e => setEditingItem({...editingItem, ingredients: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="Lista de ingredientes..."></textarea>
              </div>

              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Imagem do Produto</label>
                
                {editingItem.image_url && (
                  <div className="w-full h-40 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mb-3 flex items-center justify-center p-2 relative">
                    <img 
                      src={editingItem.image_url.startsWith('http') ? editingItem.image_url : (editingItem.image_url.startsWith('/') ? editingItem.image_url : '/' + editingItem.image_url)} 
                      alt="Preview proporcional" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                )}

                <div className="flex gap-3 items-center">
                  <input type="text" value={editingItem.image_url || ''} onChange={e => setEditingItem({...editingItem, image_url: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" placeholder="URL da imagem (ou faça o upload abaixo)" />
                </div>
                
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ou faça upload do seu computador (Recomendado)</label>
                  <input 
                    type="file" 
                    accept="image/jpeg, image/png, image/webp" 
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2.5 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-[#ea1d2c]/10 file:text-[#ea1d2c]
                      hover:file:bg-[#ea1d2c]/20
                      cursor-pointer border border-gray-200 rounded-lg p-1 bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">Formatos aceitos: JPG, PNG, WEBP. A imagem será salva no bucket "images" do seu Supabase.</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="font-medium text-gray-900 mb-3">Preços (Deixe em branco se não se aplicar)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Preço Único (€)</label>
                    <input type="number" step="0.01" value={editingItem.price_single || ''} onChange={e => setEditingItem({...editingItem, price_single: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Preço P (Pizzas)</label>
                    <input type="number" step="0.01" value={editingItem.price_p || ''} onChange={e => setEditingItem({...editingItem, price_p: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Preço M (Pizzas)</label>
                    <input type="number" step="0.01" value={editingItem.price_m || ''} onChange={e => setEditingItem({...editingItem, price_m: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-gray-600">Preço G (Pizzas)</label>
                    <input type="number" step="0.01" value={editingItem.price_g || ''} onChange={e => setEditingItem({...editingItem, price_g: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#ea1d2c] hover:bg-[#c91825] transition-colors flex items-center gap-2 shadow-sm">
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
