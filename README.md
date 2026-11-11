# MoldTech Leads

Aplicación independiente del software industrial de MoldTech. Next.js, React, TypeScript y PostgreSQL Neon. Acceso privado para el equipo comercial; administrador autorizado: `jl.rangel@moldtech.mx`.

## Instalación

Requiere Node.js 24 y npm. Ejecutar `npm ci`. Copiar `.env.example` a `.env.local` y configurar los secretos privados fuera de Git. No usar credenciales expuestas anteriormente.

- `npm run dev`: desarrollo.
- `npm run build` y `npm start`: compilación y ejecución de producción.
- `node --env-file=.env.local scripts/migrate.mjs`: migraciones versionadas, conexión directa con verificación TLS. Revisar destino, respaldo y diferencias antes de aplicarlas a producción. No ejecutar durante el build de Vercel.
- `scripts/provision-admin.mjs`: aprovisionamiento seguro existente mediante entrada privada; bcrypt, nunca contraseña versionada. Los usuarios temporales deben cambiar contraseña y se revocan sus sesiones anteriores.

## Captura y calendario

Exactamente 13 preguntas: las primeras 12 permanecen; la 13 captura fecha, hora y duración (30 minutos por defecto). Nombre, empresa y teléfono o correo son obligatorios. Reunión opcional; sin fecha se registra pendiente. Se conserva `demoInterest` histórico sin inventar fechas.

Prospecto y reunión se guardan en una transacción. PostgreSQL impide horarios superpuestos del mismo responsable, incluso con solicitudes simultáneas. Los instantes se guardan como `timestamptz` y se muestran en `America/Mexico_City`. La disponibilidad sugerida es interna, de 09:00 a 18:00, sin integración con Google Calendar.

Calendario mensual/semanal/diario, búsqueda, responsable, estado, reprogramación y cancelación. Papelera recuperable para prospectos; no borra físicamente los datos. CSV protege contra fórmulas. No existe modo demostración ni contraseñas visibles.

## Notificaciones independientes

**Formspree:** `https://formspree.io/f/mwllgpag`. `FORMSPREE_ENABLED=true` solo después de comprobar en su panel el destinatario `jl.rangel@moldtech.mx`. Se notifica tras confirmar la transacción, fuera de la respuesta de captura. El prospecto permanece si falla. Rechazo explícito permite reintento; estado ambiguo requiere revisión. No se utiliza para ICS ni promociones automáticas.

**SMTP:** configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_APP_PASSWORD`, `SMTP_FROM` y `SMTP_ENABLED`. El remitente autorizado es `jl.rangel@moldtech.mx`. Los MX del dominio apuntan a Google; esto no confirma que la cuenta admita contraseñas de aplicación. Validar las políticas del administrador de Workspace y probar con destinatarios internos autorizados antes de habilitarlo. Nunca pegar secretos en el frontend, logs o Git.

Nodemailer genera MIME e ical-generator genera iCalendar. UID estable, SEQUENCE incremental, REQUEST/CANCEL. Solo se encola invitación con correo válido y confirmación explícita. Outbox transaccional, reclamo exclusivo y reintentos manuales solo de fallos conocidos. Un timeout o envío interrumpido queda `unknown`; nunca se reenvía automáticamente. `sent` significa aceptación SMTP, no entrega final ni RSVP. No se afirma aceptación del invitado. Las notas internas no forman parte del mensaje.

La cola se procesa después de guardar o actualizar una reunión. Si el proceso se interrumpe antes de tomar un mensaje pendiente, un operador puede usar el reintento desde la reunión; los resultados ambiguos requieren reconciliación con el proveedor. No hay un cron de producción configurado.

## Seguridad y privacidad

Cookies HttpOnly, Secure en producción, SameSite Strict; sesiones hash de tokens en Neon, ocho horas de expiración. Rutas administrativas autenticadas y mutaciones con validación de origen. Consultas SQL parametrizadas. Contraseñas bcrypt y cambio inicial obligatorio. No hay espera tras un error normal de contraseña: únicamente se limita un volumen superior a 30 intentos por minuto por identificador.

El aviso jurídico sigue pendiente de aprobación: identidad legal, domicilio, finalidades, derechos ARCO, contacto y procedimiento de cambios. No publicar como aviso definitivo ni captar datos personales reales hasta aprobarlo. Consentimiento promocional opt-in separado de confirmación de reunión. No se envían promociones automáticas.

## Pruebas aisladas

La base de QA `moldtech_calendar_qa` vive en una rama Neon separada. No usar la base de producción para tests. `.env.qa.local` debe contener su URL privada y ambos envíos deshabilitados. El lanzador comprueba el nombre de base; usa `.next-qa` para separar artefactos.

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run dev:qa
# En otra terminal:
npm run test:e2e
```

Playwright crea usuarios con contraseñas aleatorias y prospectos con dominios `.invalid`, solo en QA. Evidencias locales: `test-results/` y `playwright-report/` (ignorados por Git). No se altera la cuenta del administrador real. Las pruebas MIME/Formspree son simuladas; no demuestran entrega real.

## Preview y producción

Vercel: Next.js, raíz del repositorio, `npm ci`, `npm run build`, salida estándar sin `dist`. La rama `integrate/commercial-calendar` tiene variables de Preview específicas para QA. No mezclar esa URL con la base de producción.

La rama consolida el trabajo anterior de PR #1/#2/#3; no deben fusionarse como implementaciones independientes. Revisar un único diff acumulado hacia `main`. Producción requiere aprobar privacidad, SMTP/Formspree, pruebas reales autorizadas, respaldo y migraciones revisadas. No hacer merge ni promover este Preview sin cumplir esos requisitos.

Ver `MOLDTECH_FINAL_QA_REPORT.md` para evidencia y pendientes. Los documentos antiguos de Supabase son históricos y no describen la integración vigente; esas dependencias ya no se utilizan.

## Gmail SMTP: preparación final

Configuración prevista: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=jl.rangel@moldtech.mx`, `SMTP_FROM=jl.rangel@moldtech.mx`, `SMTP_ENABLED=false`. `SMTP_APP_PASSWORD` permanece privada en Vercel. No exportarla para pruebas locales.

`GET /api/integrations/status` requiere sesión y comprueba configuración sin conexión a Gmail ni envío; solo informa si existe la contraseña, jamás su valor. Node.js es obligatorio por Cache Components de esta versión de Next.js; no se declara Edge ni un `runtime` de ruta incompatible.

Timeout de conexión y saludo: 10 segundos; inactividad SMTP: 20 segundos. Se cierra el transporte en `finally`. La cola conserva estados y evita el envío pendiente de prospectos archivados. Las pruebas `tests/e2e/smtp-worker.spec.ts` utilizan Neon QA real y un emisor SMTP simulado inyectado únicamente desde el test; no hay un endpoint de bypass o simulación en producción.

Ver [procedimiento controlado](docs/gmail-controlled-test.md) y `MOLDTECH_SMTP_CALENDAR_QA.md`. La credencial previamente expuesta debe rotarse antes de utilizar prospectos reales. El cambio de variables Production no publica código ni actualiza un deployment ya construido.
