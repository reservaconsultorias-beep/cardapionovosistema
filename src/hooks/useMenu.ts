import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ALL_MENU_ITEMS, MenuItem } from '../data/menu';

export const cleanItemNameForSorting = (name: string): string => {
  return name.replace(/^\d+\s*[-–—]\s*/, '').trim();
};

export const compareMenuItemsAlphabetically = (a: { name: string }, b: { name: string }): number => {
  const cleanA = cleanItemNameForSorting(a.name);
  const cleanB = cleanItemNameForSorting(b.name);
  const diff = cleanA.localeCompare(cleanB, 'pt', { numeric: true, sensitivity: 'base' });
  if (diff !== 0) return diff;
  return a.name.localeCompare(b.name, 'pt', { numeric: true, sensitivity: 'base' });
};

export interface Category {
  id: string;
  name: string;
  order_index: number;
  display_group?: string | null;
  display_label?: string | null;
  display_sub?: string | null;
  icon?: string | null;
}

export function useMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(ALL_MENU_ITEMS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadData = async () => {
    try {
      const { data: cats, error: catError } = await supabase
        .from('categories')
        .select('id, name, order_index, display_group, display_label, display_sub, icon')
        .eq('is_active', true)
        .neq('id', 'system_config')
        .order('order_index');
      if (catError) throw catError;

      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .neq('category', 'system_config')
        .order('sort_order');
      if (itemsError) throw itemsError;

      if (!cats || cats.length === 0 || !items || items.length === 0) {
        throw new Error('Banco de dados retornou vazio');
      }

      const normalizeItem = (it: any): MenuItem => {
        let priceBig = it.price_big ?? it.priceBig;
        let priceSuperBig = it.price_super_big ?? it.priceSuperBig;
        
        if (priceBig === undefined || priceBig === null) {
          if (it.category === 'tradicionais') priceBig = 23.99;
          else if (it.category === 'especiais') priceBig = 27.99;
          else if (it.category === 'gourmet') priceBig = 34.99;
        }

        if (priceSuperBig === undefined || priceSuperBig === null) {
          if (it.category === 'tradicionais') priceSuperBig = 28.99;
          else if (it.category === 'especiais') priceSuperBig = 32.99;
          else if (it.category === 'gourmet') priceSuperBig = 36.99;
        }

        return {
          id: it.id,
          name: it.name,
          ingredients: it.ingredients,
          category: it.category,
          priceSingle: it.price_single ?? it.priceSingle ?? undefined,
          priceP: it.price_p ?? it.priceP ?? undefined,
          priceM: it.price_m ?? it.priceM ?? undefined,
          priceG: it.price_g ?? it.priceG ?? undefined,
          priceBig: priceBig ?? undefined,
          priceSuperBig: priceSuperBig ?? undefined,
          imageUrl: it.image_url ?? it.imageUrl ?? undefined,
          dayOfWeek: it.day_of_week ?? it.dayOfWeek ?? undefined,
          isBestseller: it.is_bestseller ?? it.isBestseller ?? false,
        };
      };

      const normalizedItems: MenuItem[] = items.map(normalizeItem);

      // Garante que dentro de cada categoria os itens fiquem estritamente em ordem alfabética
      const catOrderMap = new Map<string, number>();
      cats?.forEach((c, idx) => {
        catOrderMap.set(c.id, c.order_index ?? idx);
      });

      normalizedItems.sort((a, b) => {
        const catAOrder = catOrderMap.get(a.category) ?? 999;
        const catBOrder = catOrderMap.get(b.category) ?? 999;
        if (catAOrder !== catBOrder) {
          return catAOrder - catBOrder;
        }
        return compareMenuItemsAlphabetically(a, b);
      });

      setMenuItems(normalizedItems);
      setCategories(cats as Category[]);
      setUsingFallback(false);
    } catch (err) {
      console.warn('[useMenu] Não foi possível carregar dados do Supabase, usando cardápio estático de reserva.', err);
      // If we fall back to static menu, we also inject the new sizes
      
      const normalizeStaticItem = (it: MenuItem): MenuItem => {
        let priceBig = it.priceBig;
        let priceSuperBig = it.priceSuperBig;
        
        if (priceBig === undefined || priceBig === null) {
          if (it.category === 'tradicionais') priceBig = 23.99;
          else if (it.category === 'especiais') priceBig = 27.99;
          else if (it.category === 'gourmet') priceBig = 34.99;
        }

        if (priceSuperBig === undefined || priceSuperBig === null) {
          if (it.category === 'tradicionais') priceSuperBig = 28.99;
          else if (it.category === 'especiais') priceSuperBig = 32.99;
          else if (it.category === 'gourmet') priceSuperBig = 36.99;
        }

        return {
          ...it,
          priceBig,
          priceSuperBig
        };
      };

      const staticItems = ALL_MENU_ITEMS.map(normalizeStaticItem);
      staticItems.sort((a, b) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return compareMenuItemsAlphabetically(a, b);
      });

      setMenuItems(staticItems);
      setCategories([]);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channelId = `public:menu-live-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { menuItems, categories, loading, usingFallback, refresh: loadData };
}
