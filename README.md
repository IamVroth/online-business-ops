# Online Business Operation System

A multi-user web app to manage **Sales**, **Expenses**, **Facebook ad reports**, and a consolidated **business dashboard**.

Built with **Next.js 14 (App Router)** + **TypeScript** + **TailwindCSS** + **Supabase** (Postgres + Auth + Storage + RLS).

## Features

- 🔐 Auth with role-based access (`admin`, `manager`, `staff`) enforced by Postgres RLS
- 🛒 **Sales** — orders with line items, channels, filters, discounts
- 📦 **Products** — catalog (no inventory)
- 💸 **Expenses** — categorized, with receipt image upload (Supabase Storage)
- 📊 **Facebook Ads** — CSV upload (Ads Manager export), campaign metrics, CPL, CTR
- 📈 **Dashboard** — Revenue, Expenses, Profit, ROAS, Orders, AOV, Leads + charts
- 👥 Admin **User management** — role + active/deactivate

## 1. Prerequisites

- Node.js 18.17+
- A free [Supabase](https://supabase.com) project

## 2. Supabase setup

1. Create a new Supabase project.
2. In the SQL editor, paste and run `supabase/schema.sql`.
3. **Auth → Providers → Email**: enable email/password. Disable "Confirm email" for local testing if you want instant sign-in.
4. **Storage** bucket `receipts` is created by the schema (private).
5. Grab **Project URL**, **anon key**, and **service role key** from Project Settings → API.

### Promote yourself to admin

After you sign up the first user, run this in the SQL editor (replace with your email):

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## 3. Local run

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

npm install
npm run dev
```

Open http://localhost:3000 → sign up → promote yourself → start using.

## 4. Facebook CSV format

Export from **Ads Manager → Reports** with columns like:

- `Campaign name`, `Day` (or `Date`, `Reporting starts`)
- `Amount spent (USD)` (or `Spend`), `Reach`, `Impressions`
- `Link clicks` (or `Clicks`), `Results` (or `Leads`)

The uploader auto-maps common column names; unknown columns are ignored.

## 5. Deploy

- Push repo to GitHub.
- Import into **Vercel**, set the same env vars.
- Supabase URL/keys work in both local and production.

## 6. Roadmap (not yet implemented)

- Meta Marketing Graph API integration (auto-sync insights via Vercel Cron)
- CSV/PDF export from dashboard
- Recurring expense auto-generation job
- Audit log UI

## Project structure

```
app/
  (app)/           # authenticated app pages
    page.tsx       # dashboard
    sales/
    products/
    expenses/
    facebook/
    settings/
  login/  signup/  auth/
components/        # UI + feature components
lib/
  actions.ts       # server actions
  supabase/        # server + client + admin
  utils.ts
supabase/
  schema.sql       # run this in Supabase SQL editor
middleware.ts      # auth-protects all non-/login routes
```

## License

MIT — internal J Company use.
