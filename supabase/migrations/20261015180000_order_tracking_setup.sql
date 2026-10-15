-- Migration para Order Tracking no 41 Menus
-- Garante a coluna tracking_code com código randômico único
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tracking_code text UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

-- Preenche tracking_code nos pedidos antigos que estiverem sem
UPDATE public.orders 
SET tracking_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) 
WHERE tracking_code IS NULL;

-- Cria a RPC segura get_order_by_tracking_code
CREATE OR REPLACE FUNCTION public.get_order_by_tracking_code(p_code text)
RETURNS TABLE (
  id bigint,
  status text,
  order_type text,
  payment_method text,
  total_amount numeric,
  items jsonb,
  created_at timestamptz,
  customer_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT o.id, o.status, o.order_type, o.payment_method,
         o.total_amount, o.items, o.created_at, o.customer_name
  FROM public.orders o
  WHERE o.tracking_code = p_code;
$$;

REVOKE ALL ON FUNCTION public.get_order_by_tracking_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking_code(text) TO anon, authenticated;
