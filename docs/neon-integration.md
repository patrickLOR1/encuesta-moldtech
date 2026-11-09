# Integración Neon

El backend usa pg y DATABASE_URL privada. Migración: `node --env-file=.env.local scripts/migrate.mjs`. Aprovisionamiento: inyectar ADMIN_INITIAL_PASSWORD temporalmente en el proceso y ejecutar `node --env-file=.env.local scripts/provision-admin.mjs`; eliminar la variable después. Nunca versionar valores.

Administrador: jl.rangel@moldtech.mx. Hash bcrypt coste 12. Sesiones aleatorias de 32 bytes almacenadas como SHA-256, duración 8 horas, cookies HttpOnly/SameSite Strict/Secure en producción. Cambio inicial obligatorio; las rutas de prospectos deniegan acceso hasta completarlo. Cambiar contraseña revoca todas las sesiones. Limitación persistente de cinco intentos por correo cada 15 minutos.

Se aplicó db/001-neon.sql al proyecto autorizado y se aprovisionó el administrador. Se restableció la contraseña PostgreSQL comprometida y actualizó DATABASE_URL sensible en Preview y Production. FORMSPREE_ENABLED permanece false para evitar envíos reales.

Pendientes: E2E con cambio de contraseña y navegador, verificación responsive, validación del nuevo Preview, limitación adicional por IP y revisión de concurrencia de ediciones. El esquema conserva las 13 respuestas en JSONB validado por el servidor. No afirmar preparación para producción hasta completar seguridad y E2E.
