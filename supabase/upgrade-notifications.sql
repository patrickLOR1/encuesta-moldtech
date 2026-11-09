-- Aplicar después de schema.sql, sólo en el proyecto independiente de Leads.
alter table public.lead_records add column deleted_at timestamptz;
alter table public.lead_records add column notification_status text not null default 'pending' check(notification_status in ('pending','sending','sent','unknown'));
grant update(deleted_at,notification_status) on public.lead_records to authenticated;
-- La papelera conserva datos y restricciones únicas. Recuperación desde la aplicación.
