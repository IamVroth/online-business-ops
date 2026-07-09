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

alter table public.sales
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists customer_phone text,
  add column if not exists customer_address text;

alter table public.customers enable row level security;

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
