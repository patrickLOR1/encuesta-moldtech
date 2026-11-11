# MoldTech — QA de Gmail SMTP y calendario

Fecha: 10 de noviembre de 2026. Rama: `integrate/gmail-smtp-final`, basada en `6193e4b` y PR #4. Código de aplicación verificado: `459d0ece4d16a17068a954c3c1388ce3e30b6170`.

## Cambios y configuración

Se conservaron las 13 preguntas, Neon, calendario interno, edición, CSV, filtros, papelera y restauración. No se incorporó Google Calendar API ni otro proveedor de correo.

Variables verificadas/agregadas en Vercel, proyecto `encuesta-moldtech`:

| Variable | Configuración | Ambientes |
|---|---|---|
| SMTP_APP_PASSWORD | Existente, Sensitive; no leída ni modificada | Preview y Production |
| SMTP_HOST | smtp.gmail.com | Preview y Production |
| SMTP_PORT | 465 | Preview y Production |
| SMTP_SECURE | true | Preview y Production |
| SMTP_USER | jl.rangel@moldtech.mx | Preview y Production |
| SMTP_FROM | jl.rangel@moldtech.mx | Preview y Production |
| SMTP_ENABLED | false | Preview y Production |
| DATABASE_URL | Privada, base QA, específica de rama | Preview de esta rama |
| FORMSPREE_ENABLED | false, específica de rama | Preview de esta rama |

Se agregaron solo las variables SMTP faltantes y no se alteró la contraseña. Production no recibió cambios de código ni redeploy; las variables nuevas entrarán en vigor en una publicación futura autorizada.

Configuración validada en servidor; endpoint autenticado `/api/integrations/status` devuelve metadatos y un booleano de presencia de contraseña, nunca el secreto. No prueba autenticación contra Gmail ni entrega.

Cache Components de Next.js requiere Node.js y prohíbe `export const runtime` de ruta. Se conserva Node.js obligatorio sin Edge. La declaración redundante se detectó durante pruebas y se retiró según la documentación incluida en Next.js, sin desactivar la validación del framework.

Nodemailer: conexión/saludo 10 s, inactividad 20 s, TLS, logs SMTP deshabilitados y cierre del transporte en `finally`. La conexión Neon con `sslmode=require` se convierte a `verify-full` para verificar certificado y hostname; no se desactiva TLS.

## Persistencia y cola

Se extrajo el procesador de invitaciones para probarlo con Neon real y un emisor simulado. La aplicación conserva el transporte Gmail; ningún endpoint permite inyectar un mock. El reclamo concurrente actualiza `sending`, el resultado se persiste en outbox y reunión. Un envío interrumpido queda `unknown`, no se reenvía automáticamente. Los prospectos archivados no envían invitaciones pendientes.

Se comprobaron UID estable, SEQUENCE, REQUEST/CANCEL, UTC y MIME `text/calendar` más ICS. Las notas internas no se incluyen. `sent` significa aceptación SMTP, no entrega ni aceptación del evento.

API de papelera distingue 400 (datos), 401 (sesión), 404 (registro ausente), 403 (origen) y 503 (fallo operativo).

## Pruebas

- `npm run build`: PASS.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: 28 PASS, 0 FAIL. Incluye cuatro regresiones de métricas, validaciones, Formspree simulado, ICS/MIME y clasificación de errores SMTP.
- Seis pruebas nuevas de integración de outbox: PASS, Neon QA real + SMTP simulado. Configuración sin exposición del secreto, concurrencia sin duplicados, rechazo/reintento, timeout ambiguo, proceso interrumpido y archivado.
- Prueba nueva de navegador: PASS tras corregir un selector del test. Teléfono/correo inválidos, fecha pasada, guardado, búsqueda, interés, filtros y descarga CSV.
- Suite completa de 17 E2E/integración: **17 PASS, 0 FAIL**, ejecución de 1.4 minutos. Total de esa ejecución local: **45 PASS, 0 FAIL** (28 unitarias/simuladas + 17 E2E/integración).
- Repetición posterior del caso de validaciones/filtros/CSV: **0 PASS, 1 FAIL**, timeout de 60 s en `download.path()`. No se considera resuelto por el resultado anterior. El evento de descarga aparece, pero su finalización queda pendiente. Pruebas mínimas independientes de MoldTech también agotaron el tiempo al descargar CSV mediante Blob en Chromium y Chrome instalado, y mediante HTTP local en Chromium. Esto apunta a una limitación del entorno/navegador, pero no prueba una causa definitiva. Retrasar la liberación del Blob no corrigió el fallo y se retiró ese cambio experimental. **Exportación CSV: BLOCKED para la aprobación final**, repetir en un entorno de navegador saludable antes de producción; no se omitió ni desactivó el test.
- Preview: **15 PASS, 0 FAIL**, con `scripts/verify-preview.mjs`: raíz, login real, ausencia de demo, captura, guardado en Neon QA, recarga, consulta de calendario/disponibilidad, configuración privada de integraciones y cierre de sesión. No valida entrega de correos ni descarga CSV.

Fallos intermedios: configuración `runtime` incompatible con Cache Components; selector de test demasiado estricto para el control de interés. Se corrigieron y se repitieron los casos. No se presentan las ejecuciones fallidas como aprobadas.

QA usa exclusivamente `moldtech_calendar_qa` en rama Neon `br-little-fire-be7pweg7`. No se escribió en prospectos reales ni se aplicaron migraciones nuevas a producción. Los usuarios de pruebas tienen contraseñas aleatorias con bcrypt. Las capturas y reportes de navegador quedan en `test-results/` y `playwright-report/`, ignorados por Git.

## Formspree

Endpoint conservado: `https://formspree.io/f/mwllgpag`. Guarda antes de notificar; independiente de SMTP. No se enviaron notificaciones reales. El destinatario del panel no ha podido verificarse de forma independiente; sigue pendiente confirmar `jl.rangel@moldtech.mx`. No se infiere el destinatario a partir del payload.

## Bloqueos externos y seguridad

1. **Envío real SMTP (BLOCKED por autorización):** no se conectó a Gmail para autenticar ni se envió correo. Falta elegir y autorizar una cuenta interna y completar el procedimiento `docs/gmail-controlled-test.md`. Incluye una invitación, actualización y cancelación, cada una con evidencia separada de recepción.
2. **Formspree real (BLOCKED):** confirmar el panel y la recepción interna antes de habilitarlo.
3. **Privacidad/producción (BLOCKED):** faltan razón social, domicilio, canal ARCO y aprobación de texto definitivo. Se conserva el aviso explícitamente pendiente y el consentimiento promocional desmarcado. No se inventa documentación jurídica.
4. **Exportación CSV (BLOCKED):** la repetición final falla por descarga inconclusa, también reproducida fuera de la aplicación. No se atribuye definitivamente al código ni al sistema operativo. Debe verificarse nuevamente antes de aprobar producción.

La contraseña de aplicación fue expuesta anteriormente: se recomienda rotarla antes de utilizar el sistema con prospectos reales, actualizando únicamente la variable Sensitive de Vercel. No se solicitó ni recuperó su valor.

No existe afirmación de compatibilidad comprobada en buzones Gmail/Outlook/Apple: el formato estándar fue validado, pero la incorporación y actualización en clientes reales pertenecen a la prueba autorizada pendiente.

## GitHub y Vercel

Rama de integración nueva, conservación del trabajo acumulado de PR #4. [PR #5](https://github.com/patrickLOR1/encuesta-moldtech/pull/5), borrador hacia `main`. No merge a main ni despliegue Production.

Preview verificado y READY: [abrir aplicación](https://encuesta-moldtech-h55g8qj3m-patricklor1s-projects.vercel.app). Deployment `dpl_5n9ocq6aQ1kfKpST617zbQqg1VsP`, commit `459d0ece4d16a17068a954c3c1388ce3e30b6170`. Protegido por autenticación de Vercel además del login propio de la aplicación. La prueba utilizó acceso temporal autorizado, sin publicar su token. El usuario QA temporal se desactivó al finalizar.

La comprobación autenticada confirmó configuración Gmail válida, presencia del secreto y SMTP desactivado. Neon usa exclusivamente la base QA en este Preview. Formspree también permanece desactivado. No se conectó al servidor SMTP ni se enviaron mensajes reales.

## Dictamen

Preview funcional para revisar captura y calendario; procedimiento de prueba controlada preparado en `docs/gmail-controlled-test.md`, pendiente de autorización. **Integración no aprobada para producción**: cuatro bloqueos abiertos, incluida la descarga CSV. No habilitar envíos automáticos a prospectos hasta cerrar las verificaciones anteriores.

Referencias: [Gmail SMTP oficial](https://developers.google.com/workspace/gmail/imap/imap-smtp), [transporte y timeouts Nodemailer](https://nodemailer.com/smtp), [eventos iCalendar](https://nodemailer.com/message/calendar-events).
