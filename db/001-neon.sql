begin;
create table if not exists app_users(id uuid primary key default gen_random_uuid(),email text unique not null,password_hash text not null,must_change_password boolean not null default true,active boolean not null default true);
create table if not exists app_sessions(token_hash text primary key,user_id uuid not null references app_users(id),expires_at timestamptz not null);
create table if not exists login_attempts(email text primary key,attempts integer not null,window_start timestamptz not null);
create table if not exists prospectos(id uuid primary key,created_by uuid not null references app_users(id),answers jsonb not null,tracking jsonb not null,email_key text unique,phone_key text unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz,notification_status text not null default 'pending' check(notification_status in ('pending','sending','sent','unknown')),check(length(trim(answers->>'fullName'))>0),check(length(trim(answers->>'company'))>0),check(email_key is not null or phone_key is not null));
revoke all on app_users,app_sessions,login_attempts,prospectos from public;
create index if not exists prospectos_created on prospectos(created_at desc);
commit;
