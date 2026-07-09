alter table public.products
  add column if not exists delivery_fee numeric(12,2) not null default 0,
  add column if not exists delivery_company_min_qty numeric(12,2);

alter table public.sale_items
  add column if not exists delivery_fee numeric(12,2) not null default 0,
  add column if not exists delivery_fee_payer text not null default 'customer';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sale_items_delivery_fee_payer_check'
      and conrelid = 'public.sale_items'::regclass
  ) then
    alter table public.sale_items
      add constraint sale_items_delivery_fee_payer_check
      check (delivery_fee_payer in ('customer','company'));
  end if;
end $$;
