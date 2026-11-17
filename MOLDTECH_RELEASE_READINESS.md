# Preparación de la liberación de MoldTech Leads

17 de noviembre de 2026. Revisión acumulada en PR #5, rama integrate/gmail-smtp-final. Los PR #1 a #5 siguen abiertos. main apunta a 6ba2e27, integración Neon a d76108a, calendario a 6193e4b y la corrección de aplicación a cabe1b6. La URL pública de producción resuelve al deployment READY dpl_DS4Erg2Qi13Ra5cv5dA2vDtcvK2h, commit 6193e4b.

## PASS

- Build Next, TypeScript y ESLint. 28 unitarias y 19 E2E/integración en base QA real. Regresión de login sin JS y con scripts de hidratación bloqueados: campos deshabilitados y envío forzado por POST sin credenciales en el cuerpo ni en la URL. Login hidratado usa JSON por POST y cambio de contraseña por PATCH. La cookie de sesión es HttpOnly, Secure en despliegue y SameSite Strict.
- Descarga real desde la lista filtrada en Chromium, Google Chrome y Microsoft Edge, 3/3. Archivo leído con decodificador UTF-8 estricto, BOM, encabezados y empresa esperada. Excel de escritorio abrió 20 columnas y 2 filas, con cabecera, acentos y empresa correctos. La prueba unitaria verifica escape de comillas y fórmulas. Se inserta el enlace en el documento y se difiere la liberación de la URL del Blob. Los fallos históricos se conservan en el informe QA. No quedó determinada una causa única de los timeouts de noviembre 10.
- Capturas locales de login, formulario, tablero y calendario en test-results/ a 375, 390, 768, 1024 y 1440 px. Pruebas con SMTP simulado, concurrencia, cancelación, estados ambiguos y persistencia en Neon QA. Se ejecutó el runner en la base QA ya migrada sin migraciones nuevas.
- La corrección del runner bloquea una base preexistente sin historial y aplica cada migración pendiente y su registro de control en la misma transacción.

## Neon Production y plan para autorización

Se verificó el respaldo backup-antes-calendario-20261110 (br-dawn-bread-berfy0f7), y se consultó neondb de production (br-wispy-rain-be27gzig) en modo lectura. Dos prospectos, un administrador con correo .mx y ninguno con la dirección anterior .com. Existen app_users, app_sessions, login_attempts y prospectos. Sus 21 columnas y 31 definiciones de restricciones consultadas coinciden con QA. Hay índices únicos de teléfono, correo y el índice cronológico. También existe playing_with_neon, ajena a la migración. Faltan meetings, invitation_outbox y schema_migrations. Esto explica por qué las rutas de calendario no pueden ejecutarse contra ese esquema.

1. Antes de autorizar escritura, confirmar la identidad de la conexión efectiva del deployment de producción mediante diagnóstico de servidor restringido o evidencia del propietario. La asignación Sensitive DATABASE_URL a Production está verificada; sus metadatos no prueban el destino efectivo. Verificar otra vez el recuento, esquema, permisos y estado del respaldo. Crear un punto de restauración actual tras autorización si hubo cambios desde el respaldo.
2. Bajo bloqueo asesor 719285 y transacción, fijar search_path a public, comprobar nuevamente que 001 está representada y que el correo ya satisface 002. Crear el historial con la definición del runner y registrar únicamente 001-neon.sql y 002-admin-email.sql como línea base. Ante una diferencia, detener y reconciliar. No ejecutar el UPDATE histórico de usuarios.
3. Ejecutar el runner con la conexión directa verificada. 003 añade btree_gist, meetings y outbox, índices, claves foráneas, unicidad de prospecto y de secuencia y exclusión de cruces. 004 añade solo reuniones pendientes sin cita inferida y sin mensajes para los prospectos sin relación. Validar cobertura exacta por prospecto, cero duplicados/huérfanos, historial 001–004, mismos prospectos/usuarios y outbox sin mensajes históricos.
4. Validar disponibilidad y consulta autenticadas en el despliegue. Ensayar escrituras de punta a punta en QA. Para revertir el código usar el despliegue previo compatible, preservando los datos. Una restauración de base requiere reconciliar escrituras más recientes y autorización independiente.

## BLOCKED / NOT TESTED

- BLOCKED producción: falta autorización de reconciliación y migración, verificación del destino efectivo y aprobación posterior del commit. No se aplicó ninguna migración en producción. No fusionar PR acumulativos anteriores.
- BLOCKED SMTP real: variables de Gmail asignadas a Preview y Production, contraseña Sensitive; la rotación de Google no está acreditada. La rotación PostgreSQL fue reportada en el trabajo previo. Confirmar vigencia/rotación con el propietario sin recuperar valores. Envío y recepción con Gmail, incorporación de la cita, actualización y cancelación en el buzón: NOT TESTED. Procedimiento en docs/gmail-controlled-test.md.
- BLOCKED Formspree: no hay bandera global FORMSPREE_ENABLED de Production, Preview tiene una específica desactivada. Falta acceso verificable al panel para confirmar jl.rangel@moldtech.mx y autorización del envío interno. Entrega real: NOT TESTED. El simulador no valida el buzón.
- BLOCKED aviso jurídico: revisar docs/aviso-privacidad-borrador.md, completar responsable, domicilio, canal ARCO, finalidades, transferencias y procedimiento de cambios. Consentimiento promocional opcional.
- FAIL histórico: descarga CSV por timeout el 10 de noviembre; la matriz actual descargó el archivo en los tres navegadores. La aplicación de migraciones nuevas sobre la base productiva y el flujo de correos externos continúan sin ejecutar.

## Evidencia del Preview

[Preview de cabe1b6](https://encuesta-moldtech-gfnmpqp1k-patricklor1s-projects.vercel.app), READY y con 15/15 comprobaciones aprobadas directamente en el despliegue: acceso, sesión privada, captura, recarga, persistencia confirmada por SQL en QA, reunión relacionada, disponibilidad y revocación al cerrar sesión. No se detectaron variables SMTP faltantes en Preview. Capturas de ejemplo locales: test-results/login-375.png, test-results/calendar-768.png y test-results/dashboard-1440.png. El archivo abierto en Excel está en test-results/qa-export.csv y contiene únicamente datos de QA.
