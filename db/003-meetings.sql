begin;
create extension if not exists btree_gist;
create table if not exists meetings (
 id uuid primary key default gen_random_uuid(),
 prospecto_id uuid not null unique references prospectos(id),
 responsable_id uuid not null references app_users(id),
 fecha_inicio_utc timestamptz,
 fecha_fin_utc timestamptz,
 timezone text not null default 'America/Mexico_City' check(timezone='America/Mexico_City'),
 estado text not null default 'pending' check(estado in ('pending','scheduled','cancelled','completed')),
 email_invitado text,
 confirmed boolean not null default false,
 calendar_uid text not null unique default (gen_random_uuid()::text || '@moldtech.mx'),
 calendar_sequence integer not null default 0 check(calendar_sequence>=0),
 invitation_status text not null default 'pending' check(invitation_status in ('pending','sending','sent','failed','unknown','not_requested')),
 invitation_sent_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 cancelled_at timestamptz,
 idempotency_key uuid not null unique,
 check ((fecha_inicio_utc is null and fecha_fin_utc is null and estado='pending') or (fecha_inicio_utc is not null and fecha_fin_utc>fecha_inicio_utc)),
 check(not confirmed or (email_invitado is not null and fecha_inicio_utc is not null)),
 exclude using gist (responsable_id with =,tstzrange(fecha_inicio_utc,fecha_fin_utc,'[)') with &&) where (estado='scheduled')
);
create index if not exists meetings_start on meetings(fecha_inicio_utc);
create table if not exists invitation_outbox (
 id uuid primary key default gen_random_uuid(),
 meeting_id uuid not null references meetings(id),
 sequence integer not null,
 method text not null check(method in ('REQUEST','CANCEL')),
 payload jsonb not null,
 status text not null default 'pending' check(status in ('pending','sending','sent','failed','unknown','superseded')),
 attempts integer not null default 0,
 claimed_at timestamptz,
 created_at timestamptz not null default now(),
 finished_at timestamptz,
 unique(meeting_id,sequence)
);
revoke all on meetings,invitation_outbox from public;
commit;
