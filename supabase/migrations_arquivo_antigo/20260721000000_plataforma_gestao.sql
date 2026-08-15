-- =============================================================================
-- 41 MENUS — MIGRATION FASE 0/1: Schema da Plataforma de Gestão
-- =============================================================================
-- Este arquivo é IDEMPOTENTE: pode ser executado mais de uma vez sem quebrar
-- nem apagar dados existentes. Ele usa "IF NOT EXISTS" e "ADD COLUMN IF NOT
-- EXISTS" para completar o schema, não recriá-lo do zero.
--
-- Como rodar: Supabase Dashboard → SQL Editor → colar este arquivo → Run.
-- (ou via Supabase CLI: supabase db push)
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. CATEGORIES (já existe hoje — aqui só completamos colunas que faltam)
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key,
  name text not null,
  order_index int not null default 0
);

alter table public.categories add column if not exists display_group text;
alter table public.categories add column if not exists display_label text;
alter table public.categories add column if not exists display_sub text;
alter table public.categories add column if not exists icon text;
alter table public.categories add column if not exists is_active boolean not null default true;
alter table public.categories add column if not exists created_at timestamptz not null default now();

comment on column public.categories.display_group is
  'Se preenchido, agrupa esta categoria visualmente com outras sob uma única aba no site (ex: as 3 categorias de esfihas exibidas juntas na aba "Esfihas").';

-- -----------------------------------------------------------------------------
-- 2. MENU_ITEMS (já existe hoje — completando colunas)
-- -----------------------------------------------------------------------------
create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  ingredients text,
  category text references public.categories(id),
  price_single numeric(10,2),
  price_p numeric(10,2),
  price_m numeric(10,2),
  price_g numeric(10,2),
  image_url text,
  day_of_week int
);

alter table public.menu_items add column if not exists is_active boolean not null default true;
alter table public.menu_items add column if not exists sort_order int not null default 0;
alter table public.menu_items add column if not exists is_bestseller boolean not null default false;
alter table public.menu_items add column if not exists created_at timestamptz not null default now();
alter table public.menu_items add column if not exists updated_at timestamptz not null default now();

comment on column public.menu_items.is_active is
  'Soft-delete: produto descontinuado (diferente de paused_items, que é pausa temporária do dia).';
comment on column public.menu_items.is_bestseller is
  'Substitui a lista fixa de IDs "mais pedidos" hoje hardcoded no front-end.';

-- -----------------------------------------------------------------------------
-- 3. PAUSED_ITEMS (já existe — mantido como está, sem alterações)
-- -----------------------------------------------------------------------------
create table if not exists public.paused_items (
  id text primary key references public.menu_items(id) on delete cascade,
  paused_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. ADICIONAIS (extras) — novo: por grupo, reaproveitável entre categorias
-- -----------------------------------------------------------------------------
create table if not exists public.extra_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- ex: "Adicionais Pizza"
  selection_type text not null default 'multiple' check (selection_type in ('single','multiple')),
  min_select int not null default 0,
  max_select int,                           -- null = sem limite
  is_required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.extras (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.extra_groups(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- Liga um grupo de adicionais a uma ou mais categorias de produto
create table if not exists public.category_extra_groups (
  category_id text not null references public.categories(id) on delete cascade,
  group_id uuid not null references public.extra_groups(id) on delete cascade,
  primary key (category_id, group_id)
);

-- -----------------------------------------------------------------------------
-- 5. SETTINGS — substitui o hack de "system_config" dentro de menu_items
-- -----------------------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('delivery_min_order', '10'),
  ('free_delivery_threshold', '20'),
  ('delivery_time_estimate', '"40 a 50 min"'),
  ('pickup_time_estimate', '"25 a 35 min"'),
  ('whatsapp_number', '"351938360931"')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- 6. DELIVERY_ZONES — substitui NEIGHBORHOOD_DELIVERY_FEES hardcoded
-- -----------------------------------------------------------------------------
create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fee numeric(10,2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
);

insert into public.delivery_zones (name, fee, sort_order) values
  ('Cotovia', 0, 1), ('Quintinha', 0, 2), ('Quintola de Santana', 0, 3),
  ('Santana', 0, 4), ('Maçã', 0, 5), ('Faúlha', 0, 6), ('Sampaio', 0, 7),
  ('Corredora', 0, 8), ('Almoinha', 0, 9), ('Alto das Vinhas', 0, 10),
  ('Carrasqueira', 0, 11), ('Vila de Sesimbra', 2.0, 12), ('Zambujal', 2.0, 13),
  ('Caixas', 4.0, 14), ('Alfarim', 4.0, 15), ('Aiana', 4.0, 16),
  ('Meco', 5.0, 17), ('Azeitão', 5.0, 18), ('Aldeia da Piedade', 5.0, 19),
  ('Aldeia de Irmãos', 5.0, 20), ('Oleiros', 5.0, 21), ('Várzeas', 5.0, 22),
  ('Vila Nogueira', 5.0, 23), ('Moinho da Torre', 5.0, 24),
  ('Casal Bolinhos', 5.0, 25), ('Lagoa da Albufeira', 6.0, 26)
on conflict (name) do nothing;

-- -----------------------------------------------------------------------------
-- 7. BUSINESS_HOURS — horário de funcionamento configurável
-- -----------------------------------------------------------------------------
create table if not exists public.business_hours (
  day_of_week int primary key check (day_of_week between 0 and 6), -- 0=domingo
  opens_at time,
  closes_at time,
  is_closed boolean not null default false
);

insert into public.business_hours (day_of_week, opens_at, closes_at, is_closed) values
  (0, '18:00', '23:00', false), (1, '18:00', '23:00', false),
  (2, '18:00', '23:00', false), (3, '18:00', '23:00', false),
  (4, '18:00', '23:00', false), (5, '18:00', '23:30', false),
  (6, '18:00', '23:30', false)
on conflict (day_of_week) do nothing;

-- -----------------------------------------------------------------------------
-- 8. PROFILES — liga auth.users a um papel (owner / atendente / cozinha)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'atendente' check (role in ('owner','atendente','cozinha')),
  full_name text,
  created_at timestamptz not null default now()
);

-- Função auxiliar para checar papel do usuário autenticado (usada nas policies)
create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- -----------------------------------------------------------------------------
-- 9. CUSTOMERS — base para CRM (histórico, "peça de novo", segmentação)
-- -----------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  notes text,
  total_orders int not null default 0,
  total_spent numeric(10,2) not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 10. ORDERS (já existe — completando colunas que faltam, incl. dados que hoje
--     só vão pro texto do WhatsApp e nunca são persistidos)
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id bigint generated always as identity primary key,
  customer_name text,
  order_type text,
  payment_method text,
  status text not null default 'Pendente',
  total_amount numeric(10,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists customer_id uuid references public.customers(id);
alter table public.orders add column if not exists delivery_address text;
alter table public.orders add column if not exists delivery_zone text;
alter table public.orders add column if not exists change_for text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists tracking_code text unique
  default encode(gen_random_bytes(6), 'hex');

-- Garante que pedidos já existentes (antes desta coluna existir) recebam um código
update public.orders set tracking_code = encode(gen_random_bytes(6), 'hex')
where tracking_code is null;

-- -----------------------------------------------------------------------------
-- 11. RPC segura para tracking público (evita expor a tabela orders inteira)
-- -----------------------------------------------------------------------------
create or replace function public.get_order_by_tracking_code(p_code text)
returns table (
  id bigint,
  status text,
  order_type text,
  payment_method text,
  total_amount numeric,
  items jsonb,
  created_at timestamptz,
  customer_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select o.id, o.status, o.order_type, o.payment_method,
         o.total_amount, o.items, o.created_at, o.customer_name
  from public.orders o
  where o.tracking_code = p_code;
$$;

revoke all on function public.get_order_by_tracking_code(text) from public;
grant execute on function public.get_order_by_tracking_code(text) to anon, authenticated;

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.paused_items enable row level security;
alter table public.extra_groups enable row level security;
alter table public.extras enable row level security;
alter table public.category_extra_groups enable row level security;
alter table public.settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.business_hours enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;

-- Leitura pública (o cardápio precisa ser visível sem login) --------------------
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);

drop policy if exists "public read menu_items" on public.menu_items;
create policy "public read menu_items" on public.menu_items for select using (true);

drop policy if exists "public read paused_items" on public.paused_items;
create policy "public read paused_items" on public.paused_items for select using (true);

drop policy if exists "public read extra_groups" on public.extra_groups;
create policy "public read extra_groups" on public.extra_groups for select using (true);

drop policy if exists "public read extras" on public.extras;
create policy "public read extras" on public.extras for select using (true);

drop policy if exists "public read category_extra_groups" on public.category_extra_groups;
create policy "public read category_extra_groups" on public.category_extra_groups for select using (true);

drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (true);

drop policy if exists "public read delivery_zones" on public.delivery_zones;
create policy "public read delivery_zones" on public.delivery_zones for select using (true);

drop policy if exists "public read business_hours" on public.business_hours;
create policy "public read business_hours" on public.business_hours for select using (true);

-- Pedidos: qualquer visitante pode CRIAR (checkout sem login), mas NUNCA listar/ler
-- a tabela inteira — o tracking público passa só pela função segura acima.
drop policy if exists "public can insert orders" on public.orders;
create policy "public can insert orders" on public.orders for insert with check (true);

-- Staff autenticado (qualquer papel) pode gerenciar o operacional do dia a dia --
drop policy if exists "staff manage paused_items" on public.paused_items;
create policy "staff manage paused_items" on public.paused_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff read all orders" on public.orders;
create policy "staff read all orders" on public.orders for select
  using (auth.role() = 'authenticated');

drop policy if exists "staff update orders" on public.orders;
create policy "staff update orders" on public.orders for update
  using (auth.role() = 'authenticated');

drop policy if exists "staff read customers" on public.customers;
create policy "staff read customers" on public.customers for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Só "owner" pode gerenciar produtos, categorias, adicionais e configurações ----
drop policy if exists "owner manage categories" on public.categories;
create policy "owner manage categories" on public.categories for all
  using (public.current_user_role() = 'owner') with check (public.current_user_role() = 'owner');

drop policy if exists "owner manage menu_items" on public.menu_items;
create policy "owner manage menu_items" on public.menu_items for all
  using (public.current_user_role() = 'owner') with check (public.current_user_role() = 'owner');

drop policy if exists "owner manage extra_groups" on public.extra_groups;
create policy "owner manage extra_groups" on public.extra_groups for all
  using (public.current_user_role() = 'owner') with check (public.current_user_role() = 'owner');

drop policy if exists "owner manage extras" on public.extras;
create policy "owner manage extras" on public.extras for all
  using (public.current_user_role() = 'owner') with check (public.current_user_role() = 'owner');

drop policy if exists "owner manage category_extra_groups" on public.category_extra_groups;
create policy "owner manage category_extra_groups" on public.category_extra_groups for all
  using (public.current_user_role() = 'owner') with check (public.current_user_role() = 'owner');

drop policy if exists "owner manage settings" on public.settings;
create policy "owner manage settings" on public.settings for all
  using (public.current_user_role() = 'owner') with check (public.current_user_role() = 'owner');

drop policy if exists "owner manage delivery_zones" on public.delivery_zones;
create policy "owner manage delivery_zones" on public.delivery_zones for all
  using (public.current_user_role() = 'owner') with check (public.current_user_role() = 'owner');

drop policy if exists "owner manage business_hours" on public.business_hours;
create policy "owner manage business_hours" on public.business_hours for all
  using (public.current_user_role() = 'owner') with check (public.current_user_role() = 'owner');

drop policy if exists "owner manage profiles" on public.profiles;
create policy "owner manage profiles" on public.profiles for all
  using (public.current_user_role() = 'owner') with check (public.current_user_role() = 'owner');

drop policy if exists "self read own profile" on public.profiles;
create policy "self read own profile" on public.profiles for select
  using (id = auth.uid());

-- =============================================================================
-- FIM DA MIGRATION 0001
-- =============================================================================
