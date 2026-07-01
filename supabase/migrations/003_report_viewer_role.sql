alter type public.user_role add value if not exists 'report_viewer';

create or replace function public.can_view_reports() returns boolean language sql stable as $$
  select public.current_role()::text in ('admin','manager','report_viewer');
$$;

drop policy if exists sales_read on public.sales;
create policy sales_read on public.sales for select
  using (public.can_view_reports() or created_by = auth.uid());

drop policy if exists sale_items_read on public.sale_items;
create policy sale_items_read on public.sale_items for select
  using (exists (select 1 from public.sales s where s.id = sale_id
    and (public.can_view_reports() or s.created_by = auth.uid())));

drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses for select
  using (public.can_view_reports() or created_by = auth.uid());
