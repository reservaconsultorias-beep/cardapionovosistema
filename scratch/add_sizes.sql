ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS price_big numeric(10,2);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS price_gigante numeric(10,2);

-- Atualiza os valores das pizzas tradicionais
UPDATE public.menu_items 
SET price_big = 23.99, price_gigante = 28.99 
WHERE category = 'tradicionais';

-- Atualiza os valores das pizzas especiais
UPDATE public.menu_items 
SET price_big = 27.99, price_gigante = 32.99 
WHERE category = 'especiais';

-- Atualiza os valores das pizzas gourmet
UPDATE public.menu_items 
SET price_big = 34.99, price_gigante = 36.99 
WHERE category = 'gourmet';
