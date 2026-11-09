# Formspree y papelera

Aplicar `supabase/upgrade-notifications.sql` después de `schema.sql` en la base independiente de Leads. No se aplicó a servicios externos durante el desarrollo.

El servidor guarda primero el prospecto y luego llama mediante HTTPS POST al endpoint público https://formspree.io/f/mwllgpag. Se incluyen las 13 respuestas, detalles de Otro dentro de su respuesta, fecha, UUID, origen, asunto y email para Reply-To. Nunca se envía desde la demostración. No se envían correos al prospecto.

Activación: `FORMSPREE_ENABLED=true` exclusivamente después de confirmar destinatario José Luis, activación del formulario, cuotas y configuración anti-spam compatible con servidor en Formspree. Deshabilitar autorespuestas al visitante. El endpoint público no necesita secretos. La respuesta aceptada no demuestra entrega en bandeja.

Estados persistentes: pending (pendiente o rechazo 4xx), sending (solicitud reclamada), sent (Formspree respondió ok:true), unknown (timeout, red, 5xx o respuesta ambigua). Sólo pending permite reintento. Una transición condicional pending → sending impide dos solicitudes simultáneas. No existe garantía de exactly-once en este endpoint: verificar manualmente Formspree por UUID antes de liberar sending/unknown. No reintentar ciegamente.

La acción Quitar prospecto mueve a papelera tras confirmación, y Restaurar revierte el cambio. No elimina físicamente datos ni correos ya enviados a Formspree. Los contactos siguen reservados por las restricciones únicas. Toda operación real exige sesión y membresía del equipo; la demostración sólo modifica memoria.

Verificación local: build, TypeScript, lint y pruebas de transporte simulado. Falta prueba contra Supabase, pruebas de concurrencia con dos sesiones y prueba real Formspree con datos ficticios autorizada. No afirmar envío o persistencia real antes de estas comprobaciones.

La auditoría amplia continúa pendiente: control de concurrencia en ediciones, paginación completa, asignación de responsable, activos oficiales y QA responsive completo. No está certificada para la exposición todavía.
