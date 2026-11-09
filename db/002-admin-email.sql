-- Corrección solicitada: conservar el usuario, hash y prospectos asociados.
begin;
update app_users set email='jl.rangel@moldtech.mx' where email='jl.rangel@moldtech.com';
commit;
