-- Add indexes for the filters and sorts used by the dashboard, reports, and list pages.
create index if not exists fb_ad_insights_date_spend_idx
  on public.fb_ad_insights(date, spend desc);

create index if not exists fb_ad_insights_date_campaign_idx
  on public.fb_ad_insights(date, campaign_name);

create index if not exists fb_page_content_metrics_date_engagements_idx
  on public.fb_page_content_metrics(date, engagements desc);

create index if not exists fb_page_content_metrics_date_page_idx
  on public.fb_page_content_metrics(date, page_name);

create index if not exists sales_channel_date_idx
  on public.sales(channel, sale_date desc);

create index if not exists expenses_category_date_idx
  on public.expenses(category_id, expense_date desc);

create index if not exists products_created_at_idx
  on public.products(created_at desc);
