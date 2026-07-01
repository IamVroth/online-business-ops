-- Add date_end column to fb_ad_insights so we can store the reporting range
-- (Facebook exports campaign totals span a range, not a single day)
alter table public.fb_ad_insights
  add column if not exists date_end date;
