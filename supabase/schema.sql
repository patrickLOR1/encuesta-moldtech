-- Ejecutar exclusivamente en un proyecto nuevo e independiente de MoldTech Leads.
create table public.team_members(id uuid primary key references auth.users(id), name text not null);
alter table public.team_members enable row level security;
create policy own_membership on public.team_members for select to authenticated using(id=(select auth.uid()));
grant select on public.team_members to authenticated;
revoke all on public.team_members from anon;
create table public.lead_records(id uuid primary key,created_by uuid not null references public.team_members(id),answers jsonb not null,tracking jsonb not null,email_key text unique,phone_key text unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(length(trim(answers->>'fullName'))>0),check(length(trim(answers->>'company'))>0),check(email_key is not null or phone_key is not null));
alter table public.lead_records enable row level security;
create policy team_read on public.lead_records for select to authenticated using(exists(select 1 from public.team_members where id=(select auth.uid())));
create policy team_insert on public.lead_records for insert to authenticated with check(created_by=(select auth.uid()) and exists(select 1 from public.team_members where id=(select auth.uid())));
create policy team_update on public.lead_records for update to authenticated using(exists(select 1 from public.team_members where id=(select auth.uid()))) with check(exists(select 1 from public.team_members where id=(select auth.uid())));
revoke all on public.lead_records from anon;
grant select,insert on public.lead_records to authenticated;
grant update(answers,tracking,email_key,phone_key,updated_at) on public.lead_records to authenticated;
create index lead_records_date on public.lead_records(created_at desc);
