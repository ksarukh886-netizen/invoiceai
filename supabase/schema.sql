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