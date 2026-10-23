export type IngredientCategory = 
  | 'laticinios' 
  | 'carnes' 
  | 'massas' 
  | 'molhos' 
  | 'vegetais' 
  | 'temperos' 
  | 'embalagens' 
  | 'outros';

export type PurchaseUnit = 'kg' | 'g' | 'l' | 'ml' | 'un' | 'lata' | 'pacote';
export type UsageUnit = 'g' | 'ml' | 'un';

export interface Ingredient {
  id: string;
  name: string;
  category: IngredientCategory;
  purchase_unit: PurchaseUnit;
  purchase_cost: number;        // Preço pago pela embalagem/fardo (ex: € 28,00)
  purchase_quantity: number;    // Quantidade na embalagem (ex: 4 kg, ou 50 unidades)
  usage_unit: UsageUnit;        // Unidade utilizada na receita (ex: 'g', 'ml', 'un')
  cost_per_usage_unit: number;  // Custo unitário por grama, ml ou un (ex: € 0,007/g)
  supplier?: string;            // Fornecedor (ex: Laticínios, Makro, Recheio)
  current_stock?: number;       // Estoque em unidades de uso
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeItem {
  ingredient_id: string;
  quantity: number;             // Quantidade utilizada na unidade de uso (ex: 220g)
}

export type ProductSize = 'P' | 'M' | 'G' | 'Big' | 'Unidade' | 'Padrao';

export interface ProductRecipe {
  id: string;
  product_id: string;           // ID do produto no menu (ex: 'p-6')
  product_name: string;
  size: ProductSize;
  items: RecipeItem[];
  packaging_cost: number;       // Custo de caixa, lacre e saco térmico (ex: € 0,65)
  fixed_overhead: number;       // Custo operacional estimado (gás/energia por pizza, ex: € 0,40)
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CMVSummary {
  recipe: ProductRecipe;
  sale_price: number;
  ingredients_cost: number;
  packaging_cost: number;
  fixed_overhead: number;
  total_cost: number;           // CMV em €
  gross_margin: number;         // Margem Bruta em €
  cmv_percent: number;          // % CMV = (total_cost / sale_price) * 100
  margin_percent: number;       // % Margem Bruta = 100 - cmv_percent
  health_status: 'optimal' | 'warning' | 'alert';
  target_price_30: number;      // Preço de venda sugerido para CMV de 30%
}
