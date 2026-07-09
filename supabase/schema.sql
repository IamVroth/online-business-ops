-- Online Business Operation System — Supabase schema
-- Run this in the Supabase SQL editor. Idempotent-ish; drop/recreate policies if needed.

-- =============== EXTENSIONS ===============
create extension if not exists "pgcrypto";

-- =============== ENUMS ===============
do $$ begin
  create type user_role as enum ('admin','manager','staff');
exception when duplicate_object then null; end $$;

alter type public.user_role add value if not exists 'report_viewer';

do $$ begin
  create type sale_status as enum ('paid','pending','cancelled','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fb_source as enum ('manual','api');
exception when duplicate_object then null; end $$;

-- =============== PROFILES ===============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'staff')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: get current user's role
create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin() returns boolean language sql stable as $$
  select public.current_role() = 'admin';
$$;
create or replace function public.is_manager_or_admin() returns boolean language sql stable as $$
  select public.current_role() in ('admin','manager');
$$;
create or replace function public.can_view_reports() returns boolean language sql stable as $$
  select public.current_role()::text in ('admin','manager','report_viewer');
$$;

-- =============== PRODUCTS ===============
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  price numeric(12,2) not null default 0,
  category text,
  delivery_fee numeric(12,2) not null default 0,
  delivery_company_min_qty numeric(12,2),
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- =============== CUSTOMERS ===============
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists customers_created_at_idx on public.customers(created_at desc);
create index if not exists customers_phone_idx on public.customers(phone);

-- =============== SALES ===============
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date not null default current_date,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text,
  customer_phone text,
  customer_address text,
  channel text,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  payment_status sale_status not null default 'paid',
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists sales_date_idx on public.sales(sale_date);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  qty numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  delivery_fee_payer text not null default 'customer' check (delivery_fee_payer in ('customer','company')),
  subtotal numeric(12,2) not null default 0
);
create index if not exists sale_items_sale_idx on public.sale_items(sale_id);

-- =============== EXPENSES ===============
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

insert into public.expense_categories (name) values
  ('Ads'),('Salary'),('Rent'),('Supplies'),('Utilities'),('Other')
on conflict do nothing;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  category_id uuid references public.expense_categories(id),
  vendor text,
  amount numeric(12,2) not null default 0,
  note text,
  receipt_url text,
  is_recurring boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists expenses_date_idx on public.expenses(expense_date);

-- =============== FACEBOOK ===============
create table if not exists public.fb_ad_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fb_account_id text unique,
  access_token text, -- store encrypted at rest via pgsodium if desired
  created_at timestamptz not null default now()
);

create table if not exists public.fb_ad_insights (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references public.fb_ad_accounts(id) on delete set null,
  campaign_name text,
  date date not null,
  date_end date,
  spend numeric(12,2) not null default 0,
  reach numeric(12,0) not null default 0,
  impressions numeric(12,0) not null default 0,
  clicks numeric(12,0) not null default 0,
  leads numeric(12,0) not null default 0,
  source fb_source not null default 'manual',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists fb_insights_date_idx on public.fb_ad_insights(date);

create table if not exists public.fb_page_content_metrics (
  id uuid primary key default gen_random_uuid(),
  page_name text not null,
  content_title text,
  content_url text,
  content_type text,
  date date not null,
  reach numeric(12,0) not null default 0,
  impressions numeric(12,0) not null default 0,
  engagements numeric(12,0) not null default 0,
  reactions numeric(12,0) not null default 0,
  comments numeric(12,0) not null default 0,
  shares numeric(12,0) not null default 0,
  clicks numeric(12,0) not null default 0,
  video_views numeric(12,0) not null default 0,
  source fb_source not null default 'manual',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists fb_page_content_metrics_date_idx on public.fb_page_content_metrics(date);
create index if not exists fb_page_content_metrics_page_idx on public.fb_page_content_metrics(page_name);

-- =============== STORAGE (receipts) ===============
insert into storage.buckets (id, name, public)
values ('receipts','receipts', false)
on conflict (id) do nothing;

-- =============== RLS ===============
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.fb_ad_accounts enable row level security;
alter table public.fb_ad_insights enable row level security;
alter table public.fb_page_content_metrics enable row level security;

-- profiles: user reads own; admin manages all
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles for insert
  with check (public.is_admin());

-- Generic pattern: authenticated read, staff writes own, manager/admin write all
-- PRODUCTS — any authenticated read; manager/admin write
drop policy if exists products_read on public.products;
create policy products_read on public.products for select using (auth.role() = 'authenticated');
drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());

-- CUSTOMERS
drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select using (auth.role() = 'authenticated');
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert
  with check (auth.role() = 'authenticated' and created_by = auth.uid());
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update
  using (public.is_manager_or_admin() or created_by = auth.uid())
  with check (public.is_manager_or_admin() or created_by = auth.uid());
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete
  using (public.is_manager_or_admin());

-- SALES
drop policy if exists sales_read on public.sales;
create policy sales_read on public.sales for select
  using (public.can_view_reports() or created_by = auth.uid());
drop policy if exists sales_insert on public.sales;
create policy sales_insert on public.sales for insert
  with check (auth.role() = 'authenticated' and created_by = auth.uid());
drop policy if exists sales_update on public.sales;
create policy sales_update on public.sales for update
  using (public.is_manager_or_admin() or created_by = auth.uid());
drop policy if exists sales_delete on public.sales;
create policy sales_delete on public.sales for delete
  using (public.is_manager_or_admin());

-- SALE ITEMS follow parent sale visibility
drop policy if exists sale_items_read on public.sale_items;
create policy sale_items_read on public.sale_items for select
  using (exists (select 1 from public.sales s where s.id = sale_id
    and (public.can_view_reports() or s.created_by = auth.uid())));
drop policy if exists sale_items_write on public.sale_items;
create policy sale_items_write on public.sale_items for all
  using (exists (select 1 from public.sales s where s.id = sale_id
    and (public.is_manager_or_admin() or s.created_by = auth.uid())))
  with check (exists (select 1 from public.sales s where s.id = sale_id
    and (public.is_manager_or_admin() or s.created_by = auth.uid())));

-- EXPENSE CATEGORIES: authenticated read, manager/admin write
drop policy if exists expcat_read on public.expense_categories;
create policy expcat_read on public.expense_categories for select using (auth.role() = 'authenticated');
drop policy if exists expcat_write on public.expense_categories;
create policy expcat_write on public.expense_categories for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- EXPENSES
drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses for select
  using (public.can_view_reports() or created_by = auth.uid());
drop policy if exists expenses_insert on public.expenses;
create policy expenses_insert on public.expenses for insert
  with check (auth.role() = 'authenticated' and created_by = auth.uid());
drop policy if exists expenses_update on public.expenses;
create policy expenses_update on public.expenses for update
  using (public.is_manager_or_admin() or created_by = auth.uid());
drop policy if exists expenses_delete on public.expenses;
create policy expenses_delete on public.expenses for delete
  using (public.is_manager_or_admin());

-- FB tables: manager/admin only (contain ad spend + tokens)
drop policy if exists fbacc_all on public.fb_ad_accounts;
create policy fbacc_all on public.fb_ad_accounts for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

drop policy if exists fbins_read on public.fb_ad_insights;
create policy fbins_read on public.fb_ad_insights for select using (auth.role() = 'authenticated');
drop policy if exists fbins_write on public.fb_ad_insights;
create policy fbins_write on public.fb_ad_insights for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

drop policy if exists fbcontent_read on public.fb_page_content_metrics;
create policy fbcontent_read on public.fb_page_content_metrics for select using (auth.role() = 'authenticated');
drop policy if exists fbcontent_write on public.fb_page_content_metrics;
create policy fbcontent_write on public.fb_page_content_metrics for all
  using (public.is_manager_or_admin()) with check (public.is_manager_or_admin());

-- Storage policies (receipts bucket): authenticated upload own, read own or manager/admin
drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects for select
  using (bucket_id = 'receipts' and (public.is_manager_or_admin() or owner = auth.uid()));
drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects for insert
  with check (bucket_id = 'receipts' and owner = auth.uid());
drop policy if exists receipts_delete on storage.objects;
create policy receipts_delete on storage.objects for delete
  using (bucket_id = 'receipts' and (public.is_manager_or_admin() or owner = auth.uid()));
