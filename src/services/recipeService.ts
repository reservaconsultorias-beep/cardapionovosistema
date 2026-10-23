import { supabase } from '../lib/supabase';
import { Ingredient, ProductRecipe, CMVSummary, PurchaseUnit, UsageUnit } from '../types/recipe';

const INGREDIENTS_STORAGE_KEY = 'menus41_recipe_ingredients';
const RECIPES_STORAGE_KEY = 'menus41_product_recipes';

// Insumos iniciais padrão com custos realistas em Euros (€) para o 41 Menu's
export const DEFAULT_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing-mozzarella',
    name: 'Queijo Mozzarella Especial',
    category: 'laticinios',
    purchase_unit: 'kg',
    purchase_cost: 28.00,
    purchase_quantity: 4.0,
    usage_unit: 'g',
    cost_per_usage_unit: 0.007, // € 7,00/kg -> € 0,007/g
    supplier: 'Makro / Fornecedor Local',
    current_stock: 25000,
    notes: 'Queijo base derretimento perfeito no forno'
  },
  {
    id: 'ing-calabresa',
    name: 'Calabresa Defumada Fatiada',
    category: 'carnes',
    purchase_unit: 'kg',
    purchase_cost: 16.50,
    purchase_quantity: 2.5,
    usage_unit: 'g',
    cost_per_usage_unit: 0.0066, // € 6,60/kg -> € 0,0066/g
    supplier: 'Distribuidora Carnes',
    current_stock: 15000,
    notes: 'Fatias finas para distribuição homogênea'
  },
  {
    id: 'ing-molho',
    name: 'Molho de Tomate Pelado Especial',
    category: 'molhos',
    purchase_unit: 'kg',
    purchase_cost: 8.50,
    purchase_quantity: 2.5,
    usage_unit: 'g',
    cost_per_usage_unit: 0.0034, // € 3,40/kg -> € 0,0034/g
    supplier: 'Recheio / Makro',
    current_stock: 12500,
    notes: 'Temperado com azeite extravirgem e orégãos'
  },
  {
    id: 'ing-catupiry',
    name: 'Requeijão Cremoso / Catupiry Original',
    category: 'laticinios',
    purchase_unit: 'kg',
    purchase_cost: 14.00,
    purchase_quantity: 1.5,
    usage_unit: 'g',
    cost_per_usage_unit: 0.0093,
    supplier: 'Importação Especializada',
    current_stock: 6000,
    notes: 'Para bordas recheadas e pizzas especiais'
  },
  {
    id: 'ing-frango',
    name: 'Peito de Frango Desfiado Temperado',
    category: 'carnes',
    purchase_unit: 'kg',
    purchase_cost: 12.00,
    purchase_quantity: 2.0,
    usage_unit: 'g',
    cost_per_usage_unit: 0.006,
    supplier: 'Açougue Parceiro',
    current_stock: 10000,
    notes: 'Cozido e desfiado artesanalmente'
  },
  {
    id: 'ing-bacon',
    name: 'Bacon em Cubos / Fatias',
    category: 'carnes',
    purchase_unit: 'kg',
    purchase_cost: 9.50,
    purchase_quantity: 1.0,
    usage_unit: 'g',
    cost_per_usage_unit: 0.0095,
    supplier: 'Distribuidor Carnes',
    current_stock: 5000,
    notes: 'Crocante para cobertura'
  },
  {
    id: 'ing-cebola',
    name: 'Cebola Fresca Fatiada',
    category: 'vegetais',
    purchase_unit: 'kg',
    purchase_cost: 4.50,
    purchase_quantity: 5.0,
    usage_unit: 'g',
    cost_per_usage_unit: 0.0009,
    supplier: 'Mercado de Frescos',
    current_stock: 10000,
    notes: 'Fatiada na hora'
  },
  {
    id: 'ing-azeitona',
    name: 'Azeitona Preta sem Caroço',
    category: 'vegetais',
    purchase_unit: 'kg',
    purchase_cost: 8.00,
    purchase_quantity: 2.0,
    usage_unit: 'g',
    cost_per_usage_unit: 0.004,
    supplier: 'Recheio',
    current_stock: 4000,
    notes: 'Finalização'
  },
  {
    id: 'ing-massa-g',
    name: 'Massa Pizza Fermentação Longa G (350g)',
    category: 'massas',
    purchase_unit: 'un',
    purchase_cost: 0.65,
    purchase_quantity: 1,
    usage_unit: 'un',
    cost_per_usage_unit: 0.65,
    supplier: 'Produção Própria',
    current_stock: 60,
    notes: 'Farinha tipo 00, 48h fermentação'
  },
  {
    id: 'ing-massa-m',
    name: 'Massa Pizza Fermentação Longa M (280g)',
    category: 'massas',
    purchase_unit: 'un',
    purchase_cost: 0.50,
    purchase_quantity: 1,
    usage_unit: 'un',
    cost_per_usage_unit: 0.50,
    supplier: 'Produção Própria',
    current_stock: 40,
    notes: 'Massa média artesanal'
  },
  {
    id: 'ing-massa-esfiha',
    name: 'Massa de Esfiha Aberta (55g)',
    category: 'massas',
    purchase_unit: 'un',
    purchase_cost: 0.12,
    purchase_quantity: 1,
    usage_unit: 'un',
    cost_per_usage_unit: 0.12,
    supplier: 'Produção Própria',
    current_stock: 200,
    notes: 'Massa fina com fubá na bancada'
  },
  {
    id: 'ing-caixa-g',
    name: 'Caixa de Pizza Familiar G + Lacre de Segurança',
    category: 'embalagens',
    purchase_unit: 'un',
    purchase_cost: 32.50,
    purchase_quantity: 50,
    usage_unit: 'un',
    cost_per_usage_unit: 0.65,
    supplier: 'Embalagens Portugal',
    current_stock: 150,
    notes: 'Microondulada térmica oitavada'
  },
  {
    id: 'ing-caixa-m',
    name: 'Caixa de Pizza Média M + Lacre',
    category: 'embalagens',
    purchase_unit: 'un',
    purchase_cost: 27.50,
    purchase_quantity: 50,
    usage_unit: 'un',
    cost_per_usage_unit: 0.55,
    supplier: 'Embalagens Portugal',
    current_stock: 100,
    notes: 'Para pizzas médias'
  }
];

// Fichas técnicas iniciais de exemplo conectadas aos produtos do 41 Menu's
export const DEFAULT_RECIPES: ProductRecipe[] = [
  {
    id: 'rec-p-6-g',
    product_id: 'p-6',
    product_name: '6 - Calabresa',
    size: 'G',
    items: [
      { ingredient_id: 'ing-massa-g', quantity: 1 },
      { ingredient_id: 'ing-molho', quantity: 90 },
      { ingredient_id: 'ing-mozzarella', quantity: 220 },
      { ingredient_id: 'ing-calabresa', quantity: 170 },
      { ingredient_id: 'ing-cebola', quantity: 50 },
      { ingredient_id: 'ing-azeitona', quantity: 30 }
    ],
    packaging_cost: 0.65,
    fixed_overhead: 0.40,
    notes: 'Pizza campeã de vendas. Receita com margem saudável.'
  },
  {
    id: 'rec-e-2-un',
    product_id: 'e-2',
    product_name: '2 - Calabresa (Esfiha)',
    size: 'Padrao',
    items: [
      { ingredient_id: 'ing-massa-esfiha', quantity: 1 },
      { ingredient_id: 'ing-mozzarella', quantity: 35 },
      { ingredient_id: 'ing-calabresa', quantity: 30 }
    ],
    packaging_cost: 0.10,
    fixed_overhead: 0.08,
    notes: 'Esfiha aberta tradicional mais pedida no balcão e delivery.'
  }
];

export const recipeService = {
  // Converte preço de compra em custo unitário de uso
  calculateCostPerUsageUnit(
    purchaseCost: number,
    purchaseQuantity: number,
    purchaseUnit: PurchaseUnit,
    usageUnit: UsageUnit
  ): number {
    if (!purchaseQuantity || purchaseQuantity <= 0) return 0;
    
    // Normalização para Gramas (g)
    if (usageUnit === 'g') {
      if (purchaseUnit === 'kg') {
        const totalGrams = purchaseQuantity * 1000;
        return Number((purchaseCost / totalGrams).toFixed(5));
      }
      if (purchaseUnit === 'g') {
        return Number((purchaseCost / purchaseQuantity).toFixed(5));
      }
    }

    // Normalização para Mililitros (ml)
    if (usageUnit === 'ml') {
      if (purchaseUnit === 'l') {
        const totalMl = purchaseQuantity * 1000;
        return Number((purchaseCost / totalMl).toFixed(5));
      }
      if (purchaseUnit === 'ml') {
        return Number((purchaseCost / purchaseQuantity).toFixed(5));
      }
    }

    // Unidades diretas
    return Number((purchaseCost / purchaseQuantity).toFixed(5));
  },

  // Busca lista de insumos com persistência Supabase + Fallback
  async getIngredients(): Promise<Ingredient[]> {
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(data));
        return data as Ingredient[];
      }
    } catch (e) {
      console.warn('Tabela recipe_ingredients indisponível no Supabase, tentando settings...', e);
    }

    // Fallback: busca de settings no Supabase
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'recipe_ingredients_data')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(data.value));
        return data.value as Ingredient[];
      }
    } catch {}

    // Fallback LocalStorage
    try {
      const local = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Fallback Padrão Inicial
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(DEFAULT_INGREDIENTS));
    return DEFAULT_INGREDIENTS;
  },

  // Salva ou atualiza um insumo
  async saveIngredient(ingredient: Partial<Ingredient>): Promise<Ingredient> {
    const costPerUsage = this.calculateCostPerUsageUnit(
      Number(ingredient.purchase_cost || 0),
      Number(ingredient.purchase_quantity || 1),
      ingredient.purchase_unit || 'kg',
      ingredient.usage_unit || 'g'
    );

    const fullIngredient: Ingredient = {
      id: ingredient.id || `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: ingredient.name || 'Novo Insumo',
      category: ingredient.category || 'outros',
      purchase_unit: ingredient.purchase_unit || 'kg',
      purchase_cost: Number(ingredient.purchase_cost || 0),
      purchase_quantity: Number(ingredient.purchase_quantity || 1),
      usage_unit: ingredient.usage_unit || 'g',
      cost_per_usage_unit: costPerUsage,
      supplier: ingredient.supplier || '',
      current_stock: ingredient.current_stock !== undefined ? Number(ingredient.current_stock) : undefined,
      notes: ingredient.notes || '',
      updated_at: new Date().toISOString()
    };

    // 1. Tenta salvar na tabela específica
    let savedToTable = false;
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .upsert(fullIngredient, { onConflict: 'id' });
      if (!error) savedToTable = true;
    } catch {}

    // 2. Atualiza estado em cache e settings
    const currentList = await this.getIngredients();
    const existingIndex = currentList.findIndex(i => i.id === fullIngredient.id);
    let updatedList: Ingredient[];

    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = fullIngredient;
    } else {
      updatedList = [...currentList, fullIngredient];
    }

    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedList));

    if (!savedToTable) {
      try {
        await supabase.from('settings').upsert({
          key: 'recipe_ingredients_data',
          value: updatedList,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Aviso ao sincronizar insumos em settings:', err);
      }
    }

    return fullIngredient;
  },

  // Exclui um insumo
  async deleteIngredient(id: string): Promise<boolean> {
    try {
      await supabase.from('recipe_ingredients').delete().eq('id', id);
    } catch {}

    const currentList = await this.getIngredients();
    const updatedList = currentList.filter(i => i.id !== id);
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await supabase.from('settings').upsert({
        key: 'recipe_ingredients_data',
        value: updatedList,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch {}

    return true;
  },

  // Busca fichas técnicas
  async getRecipes(): Promise<ProductRecipe[]> {
    try {
      const { data, error } = await supabase
        .from('product_recipes')
        .select('*')
        .order('product_name', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(data));
        return data as ProductRecipe[];
      }
    } catch (e) {
      console.warn('Tabela product_recipes indisponível no Supabase, tentando settings...', e);
    }

    // Fallback Settings
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'product_recipes_data')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(data.value));
        return data.value as ProductRecipe[];
      }
    } catch {}

    // Fallback LocalStorage
    try {
      const local = localStorage.getItem(RECIPES_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Fallback Padrão Inicial
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(DEFAULT_RECIPES));
    return DEFAULT_RECIPES;
  },

  // Salva ficha técnica
  async saveRecipe(recipe: Partial<ProductRecipe>): Promise<ProductRecipe> {
    const fullRecipe: ProductRecipe = {
      id: recipe.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product_id: recipe.product_id || '',
      product_name: recipe.product_name || 'Pizza',
      size: recipe.size || 'G',
      items: recipe.items || [],
      packaging_cost: Number(recipe.packaging_cost ?? 0.65),
      fixed_overhead: Number(recipe.fixed_overhead ?? 0.40),
      notes: recipe.notes || '',
      updated_at: new Date().toISOString()
    };

    let savedToTable = false;
    try {
      const { error } = await supabase
        .from('product_recipes')
        .upsert(fullRecipe, { onConflict: 'id' });
      if (!error) savedToTable = true;
    } catch {}

    const currentList = await this.getRecipes();
    const existingIndex = currentList.findIndex(r => r.id === fullRecipe.id);
    let updatedList: ProductRecipe[];

    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = fullRecipe;
    } else {
      updatedList = [...currentList, fullRecipe];
    }

    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedList));

    if (!savedToTable) {
      try {
        await supabase.from('settings').upsert({
          key: 'product_recipes_data',
          value: updatedList,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Aviso ao sincronizar fichas em settings:', err);
      }
    }

    return fullRecipe;
  },

  // Exclui ficha técnica
  async deleteRecipe(id: string): Promise<boolean> {
    try {
      await supabase.from('product_recipes').delete().eq('id', id);
    } catch {}

    const currentList = await this.getRecipes();
    const updatedList = currentList.filter(r => r.id !== id);
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await supabase.from('settings').upsert({
        key: 'product_recipes_data',
        value: updatedList,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch {}

    return true;
  },

  // Calcula custos, CMV e Margens de uma ficha técnica
  calculateRecipeSummary(
    recipe: ProductRecipe,
    ingredientsMap: Record<string, Ingredient>,
    salePrice: number
  ): CMVSummary {
    let ingredientsCost = 0;

    for (const it of recipe.items || []) {
      const ing = ingredientsMap[it.ingredient_id];
      if (ing) {
        const cost = (ing.cost_per_usage_unit || 0) * (it.quantity || 0);
        ingredientsCost += cost;
      }
    }

    const packagingCost = Number(recipe.packaging_cost || 0);
    const fixedOverhead = Number(recipe.fixed_overhead || 0);
    const totalCost = ingredientsCost + packagingCost + fixedOverhead;

    const price = Number(salePrice || 0);
    const grossMargin = price > 0 ? price - totalCost : 0;
    const cmvPercent = price > 0 ? Number(((totalCost / price) * 100).toFixed(1)) : 0;
    const marginPercent = price > 0 ? Number((100 - cmvPercent).toFixed(1)) : 0;

    let healthStatus: 'optimal' | 'warning' | 'alert' = 'optimal';
    if (cmvPercent > 38) {
      healthStatus = 'alert';
    } else if (cmvPercent >= 30) {
      healthStatus = 'warning';
    } else {
      healthStatus = 'optimal';
    }

    // Preço ideal para 30% de CMV (Custo / 0.30)
    const targetPrice30 = totalCost > 0 ? Number((totalCost / 0.30).toFixed(2)) : 0;

    return {
      recipe,
      sale_price: price,
      ingredients_cost: Number(ingredientsCost.toFixed(2)),
      packaging_cost: Number(packagingCost.toFixed(2)),
      fixed_overhead: Number(fixedOverhead.toFixed(2)),
      total_cost: Number(totalCost.toFixed(2)),
      gross_margin: Number(grossMargin.toFixed(2)),
      cmv_percent: cmvPercent,
      margin_percent: marginPercent,
      health_status: healthStatus,
      target_price_30: targetPrice30
    };
  }
};
