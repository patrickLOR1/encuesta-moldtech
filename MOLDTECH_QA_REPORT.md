# MoldTech QA — 2026-11-09

Informe parcial basado exclusivamente en pruebas ejecutadas. No certifica preparación para producción.

20 pruebas ejecutadas: 20 PASS, 0 FAIL, 0 bloqueadas dentro de la suite ejecutada. Los recorridos no ejecutados se indican separadamente y no cuentan como éxitos.

| Funcionalidad | Resultado | Evidencia | Observaciones |
|---|---|---|---|
| Ruta / | PASS | backend-live.test.mjs: HTTP 200 y texto MoldTech | Servidor local 3100 |
| Prospectos sin sesión | PASS | GET /api/leads → 401 | Prueba real backend |
| Sesión inexistente | PASS | GET /api/session → 401 | Prueba real backend |
| Login origen ajeno | PASS | POST /api/session → 403 | Prueba real backend |
| Seis contraseñas incorrectas consecutivas | PASS | Seis HTTP 401 sin 429 | Eliminada espera de 15 minutos a petición del usuario |
| Validación de captura y CSV | PASS | 10 pruebas unitarias | No equivale a captura en navegador |
| Formspree | PASS | 5 pruebas con fetch simulado | Sin envío real ni comprobación de destinatario |
| Login correcto/cambio de contraseña/sesión persistente | NOT TESTED | — | Pendiente E2E |
| Crear/editar/recargar prospectos y consultar PostgreSQL | NOT TESTED | — | Pendiente E2E con fixture identificado |
| Dashboard, papelera y demo completos | NOT TESTED | — | Pendiente navegador |
| Responsive 375/390/768/1024/1440 | NOT TESTED | — | Sin capturas nuevas |
| Preview Vercel actual | NOT TESTED | — | No desplegado en esta revisión |

## Corrección y riesgo

El endpoint de login ya no consulta ni incrementa login_attempts y no bloquea al usuario por intentos anteriores. Rechaza contraseñas incorrectas con el mensaje genérico existente. La tabla se conserva sin borrar datos. El rate limiting de aplicación queda retirado; esto reduce protección contra fuerza bruta y debe contemplarse antes de producción.

## Reproducción

Con DATABASE_URL configurada en .env.local, iniciar `npm run dev -- --port 3100`. En otra terminal ejecutar `node --experimental-strip-types --test tests/*.test.mjs`. TEST_BASE_URL permite cambiar el destino. Esta suite no crea prospectos, no cambia contraseñas y no envía notificaciones reales.

No se hicieron cambios en producción, merge ni envíos reales. La auditoría completa pedida continúa pendiente.
