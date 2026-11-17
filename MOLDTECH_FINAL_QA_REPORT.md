# MoldTech — Informe QA de integración

Fecha: 10 de noviembre de 2026. Rama: `integrate/commercial-calendar`.

## Estado inicial y alcance

PR #1, #2 y #3 siguen abiertos como borradores y contienen versiones acumulativas; `main` sigue en el commit inicial. La rama parte de `d76108a` de `integrate/neon-vercel`. Se conservaron captura, seguimiento, CSV, edición, papelera y restauración. El despliegue de producción existente se observó READY, pero no fue modificado ni se atribuyen las nuevas pruebas a ese despliegue.

## Implementado

- Métricas consistentes excluyendo `deleted_at`; fecha comercial en Ciudad de México.
- Pregunta 13 fecha/hora/duración opcional; primeras 12 sin cambios. Confirmación de reunión separada del consentimiento promocional. Respuesta histórica `demoInterest` preservada.
- Tabla relacional `meetings`, UTC, restricción de exclusión para evitar traslapes, transacción atómica con prospecto y bloqueo por identificador.
- Calendario mes/semana/día, fechas, búsqueda, responsable, estados, ficha, reprogramación, cancelación, próximas reuniones y disponibilidad interna.
- Outbox de invitaciones con UID, SEQUENCE, REQUEST/CANCEL, reclamo exclusivo, estado ambiguo sin reintentos automáticos. Nodemailer/ical-generator; sin notas privadas en ICS.
- Formspree posterior al commit, fuera de la respuesta de captura; datos conservados ante fallos.
- Bcrypt, sesiones protegidas, CSRF, cambio inicial y revocación de sesiones; límite de ráfagas (>30/minuto) sin bloqueo por un error normal.
- Dependencias Supabase/Resend retiradas tras comprobar ausencia de imports. Logo con Next Image, identidad marina/turquesa y corrección del ancho móvil.
- README y variables de ejemplo actualizados, pruebas Playwright reutilizables y código formateado para revisión.

## Base de datos

Proyecto `old-brook-18316777`, rama de QA `br-little-fire-be7pweg7` (`qa-commercial-calendar`), base nueva `moldtech_calendar_qa`. La base de pruebas está vacía de datos comerciales reales; fixtures solo en esta base. Migraciones 001–004 ejecutadas ahí. Ninguna migración nueva aplicada en producción. 004 añade reuniones pendientes históricas sin inventar fechas.

La conexión de QA usa verificación TLS completa. DATABASE_URL de Preview está limitada a esta rama Git y esta base; secretos ignorados por Git. La rotación previa de producción no fue repetida ni se reutilizó la conexión expuesta.

## Evidencia ejecutada

| Comprobación | Resultado | Evidencia |
|---|---|---|
| npm ci | PASS | Instalación reproducible, 402 paquetes |
| npm run build | PASS | Next genera `/` y cinco grupos de API |
| npm run lint | PASS | 0 errores, 0 advertencias de código |
| npm run typecheck | PASS | TypeScript sin errores |
| Unitarias/simuladas | 28 PASS, 0 FAIL | `npm test` |
| E2E/integración Neon | 10 PASS, 0 FAIL | `npm run test:e2e`, 1.1 minutos |
| Métricas papelera | PASS | Cuatro regresiones en `tests/metrics.test.mjs` |
| Persistencia real QA | PASS | Alta, consulta, recarga, edición, papelera, restauración |
| Concurrencia | PASS | Dos altas superpuestas: una 200, otra 409; sin duplicación de outbox |
| Reprogramar/cancelar | PASS | UID estable, SEQUENCE 0→1→2, UTC y CANCEL comprobados en Neon |
| Autenticación | PASS | Login, incorrectos, cambio inicial, revocación, sesión expirada, 401/403/429 |
| Responsive | PASS | 375, 390, 768, 1024 y 1440 px; login/dashboard/formulario/calendario |
| ICS/MIME | PASS simulado | Campos, UID, REQUEST/CANCEL, attachment y text/calendar |
| SMTP | PASS simulado | Aceptación/rechazo/timeout/desconexión; ninguna entrega real comprobada |
| Formspree | PASS simulado | 13 respuestas, éxito, rechazo, red y resultado ambiguo |
| Auditoría dependencias runtime | PASS | `npm audit --omit=dev`: 0 vulnerabilidades |

Total de casos automatizados: **38 PASS, 0 FAIL** en la última ejecución por suite. No incluye comprobaciones manuales ni build en ese total.

Capturas locales no versionadas: `test-results/login-{ancho}.png`, `dashboard-{ancho}.png`, `form-{ancho}.png`, `calendar-{ancho}.png`. Reporte de navegador: `playwright-report/index.html`. No publicar artefactos de autenticación ni secretos.

Fallos encontrados durante trabajo: prerender de fecha en cliente, desbordamiento del contenedor flex, ausencia inicial de Chromium, artefacto CSS inválido en caché y una interrupción del servidor durante recarga de desarrollo. Corregidos antes de la última ejecución. Un comando de limpieza fue rechazado por revisión automática; se utilizó un directorio QA separado sin borrar la caché original.

## Límites y bloqueos de aceptación

**BLOCKED externo (4):**
1. SMTP real: faltan variables privadas autorizadas y prueba interna Gmail/Outlook. MX apunta a Google, pero no verifica habilitación de contraseñas de aplicación. Patrick confirmó que administra el correo desde su laptop.
2. Formspree real: falta comprobar el destinatario en su panel y recepción interna. Permanece deshabilitado en este Preview.
3. Aviso de privacidad: faltan datos jurídicos/corporativos y aprobación del texto definitivo. Patrick indicó que puede aprobarlo; no equivale a una aprobación del contenido todavía pendiente.
4. Publicación: bloqueada hasta resolver 1–3 y comprobar la versión candidata. No se hizo merge ni promoción.

No se han ejecutado pruebas de entrega real ni aceptación RSVP. La cola se activa por solicitudes autenticadas; no hay cron configurado. Los resultados ambiguos requieren reconciliación manual. Archivar un prospecto no equivale a cancelar una reunión; restaurarlo permite volver a administrarla. El calendario no consulta disponibilidad externa.

La suite cubre flujos principales, pero no representa todas las combinaciones de navegadores/calendarios. Faltan capturas dedicadas de confirmación/error/detalle y una prueba end-to-end de SMTP real autorizada. `npm ci` informa 7 vulnerabilidades moderadas de herramientas de desarrollo; la auditoría de runtime reporta cero. No se aplicaron actualizaciones mayores sin revisión.

## GitHub y Vercel

Pendiente en este punto: registrar commit, PR consolidado y resultado del Preview. Variables privadas de rama configuradas: DATABASE_URL QA; FORMSPREE_ENABLED=false; SMTP_ENABLED=false. No se cambiaron variables de producción.

## Recomendación

**No publicar a producción todavía.** Completar verificaciones del Preview, aprobar privacidad, configurar SMTP mediante un canal privado, confirmar Formspree y ejecutar pruebas internas autorizadas. Antes de migrar producción: respaldo verificado, revisión del SQL, migración y prueba de conectividad no destructiva. Fusionar un único PR consolidado hacia main, evitando integrar implementaciones antiguas por separado.
