begin;
-- Preserve every historical answer; no dates are inferred from demoInterest.
insert into meetings(prospecto_id,responsable_id,email_invitado,estado,idempotency_key,invitation_status)
select id,created_by,nullif(answers->>'email',''),'pending',id,'not_requested'
from prospectos on conflict(prospecto_id) do nothing;
commit;
