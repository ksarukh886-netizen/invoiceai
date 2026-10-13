create extension if not exists pgcrypto;
create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 number text not null,
 type text not null check (type in ('Invoice','Quote')),
 customer text default '',
 email text default '',
 items jsonb not null default '[]'::jsonb,
 tax numeric not null default 0,
 discount numeric not null default 0,
 notes text default '',
 total numeric not null default 0,
 status text not null default 'Pending' check (status in ('Pending','Paid','Overdue')),
 created_at timestamptz not null default now()
);
alter table public.documents enable row level security;
create policy "users can read own documents" on public.documents for select using (auth.uid()=user_id);
create policy "users can insert own documents" on public.documents for insert with check (auth.uid()=user_id);
create policy "users can update own documents" on public.documents for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users can delete own documents" on public.documents for delete using (auth.uid()=user_id);
-- Pro subscriptions (Razorpay)
create table if not exists public.subscriptions (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade unique,
 plan text not null default 'free' check (plan in ('free','monthly','yearly')),
 status text not null default 'inactive' check (status in ('inactive','active','halted','cancelled','completed')),
 razorpay_subscription_id text unique,
 current_period_end timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists "users can read own subscription" on public.subscriptions;
create policy "users can read own subscription" on public.subscriptions for select to authenticated using (auth.uid() = user_id);
-- Clients cannot create or change subscription status. The server uses the service-role key.
drop policy if exists "users cannot write subscriptions" on public.subscriptions;
create policy "users cannot write subscriptions" on public.subscriptions for all to authenticated using (false) with check (false);

-- Enforce the Free-plan monthly cap in the database too (client checks alone can be bypassed).
create or replace function public.enforce_document_monthly_limit()
returns trigger language plpgsql security definer set search_path = public, auth as $$
declare
  is_pro boolean;
  monthly_count integer;
begin
  select exists(select 1 from public.subscriptions s where s.user_id = new.user_id and s.status = 'active') into is_pro;
  if is_pro then return new; end if;
  select count(*) into monthly_count from public.documents d
    where d.user_id = new.user_id
      and d.created_at >= date_trunc('month', now())
      and d.created_at < date_trunc('month', now()) + interval '1 month';
  if monthly_count >= 10 then
    raise exception 'Free plan allows up to 10 documents per month. Upgrade to Pro to continue.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists documents_monthly_limit on public.documents;
create trigger documents_monthly_limit before insert on public.documents
for each row execute function public.enforce_document_monthly_limit();
