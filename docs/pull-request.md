Implementa MoldTech Leads en su repositorio independiente con las 13 preguntas aprobadas, edición, ficha, seguimiento interno, filtros y CSV. Incluye autenticación de equipo con Supabase, rutas protegidas, validación compartida y esquema con RLS.

La demostración usa datos ficticios en memoria. No se han enviado correos ni desplegado a producción.

Verificación: build de Next.js y ESLint; pruebas de campos obligatorios/opcionales, teléfono, correo, máquinas, consentimiento, opciones, CSV y payload.

Pendiente de aceptación: ejecutar el esquema y probar persistencia/RLS contra un proyecto Supabase independiente, integración de entrega de correos, aviso legal aprobado y QA de navegador a 375/768/1440 px. Mantener este PR como borrador hasta concluir dichas comprobaciones.
