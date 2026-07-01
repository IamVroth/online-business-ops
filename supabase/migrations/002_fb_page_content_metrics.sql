-- Store Facebook page/post content metrics separately from paid ad insights.
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

create index if not exists fb_page_content_metrics_date_idx
  on public.fb_page_content_metrics(date);

create index if not exists fb_page_content_metrics_page_idx
  on public.fb_page_content_metrics(page_name);

alter table public.fb_page_content_metrics enable row level security;

drop policy if exists fbcontent_read on public.fb_page_content_metrics;
create policy fbcontent_read on public.fb_page_content_metrics for select
  using (auth.role() = 'authenticated');

drop policy if exists fbcontent_write on public.fb_page_content_metrics;
create policy fbcontent_write on public.fb_page_content_metrics for all
  using (public.is_manager_or_admin())
  with check (public.is_manager_or_admin());
