# Auditoría inicial de Plastimagen

Estado: no apta todavía para uso real en exposición.

## Evidencia inicial

Repositorio con árbol limpio en e766a6c. Next.js App Router, TypeScript, formulario de tres secciones, dashboard y API Supabase. No existe integración de entrega de correos. La demostración usa memoria. No se ha verificado persistencia real ni RLS con credenciales configuradas.

## Hallazgos pendientes

- Las ediciones carecen de control de concurrencia: pueden sobrescribir cambios de otro representante.
- La búsqueda no incluye contactos; faltan filtros de fecha y asignación de responsable.
- El formulario no advierte al abandonar respuestas sin guardar.
- El listado limita 5000 registros sin indicación de truncamiento.
- No existe outbox de correo ni estado de entrega real.
- El aviso de privacidad es provisional y no debe presentarse como definitivo.
- No se localizaron recursos oficiales de marca entre los archivos versionados. El logo y video siguen pendientes.
- Faltan pruebas de navegador a 375, 390, 768 y 1440 px.

## Clasificación

Funcionando y verificada previamente: compilación, lint y diez pruebas unitarias de validación/CSV.

Implementada, pendiente de prueba externa: autenticación, API de persistencia y esquema RLS.

Pendiente de configuración: proyecto Supabase independiente, usuarios, aviso de privacidad y activos oficiales.

No implementada: integración de correo, idempotencia de envíos y concurrencia de edición.

No se ha desplegado, enviado correo ni fusionado código con main durante esta auditoría.
