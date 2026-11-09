# MoldTech Leads

Repositorio oficial independiente: https://github.com/patrickLOR1/encuesta-moldtech

Next.js, React y TypeScript. Captura las 13 preguntas aprobadas en tres secciones. Sólo exige nombre, empresa y teléfono o correo válido. Incluye edición, ficha completa, seguimiento interno, búsqueda, filtros y CSV con protección contra fórmulas.

## Instalación y ejecución

Requiere Node.js 24 y npm.

```sh
npm ci
npm run dev
```

Abre http://localhost:3000. El botón «Explorar con datos ficticios» abre una demostración en memoria; recargar elimina sus cambios. Nunca introducir datos reales en la demostración. No hay contraseñas de demostración ni datos personales persistidos en el navegador.

## Supabase independiente

1. Crea un proyecto exclusivo para Leads; no uses la base industrial.
2. Ejecuta `supabase/schema.sql` una vez en una base vacía. Habilita RLS y acceso sólo a miembros internos.
3. Copia `.env.example` a `.env.local` y configura URL y publishable key. La aplicación no necesita una clave service-role para acceder a prospectos.
4. Deshabilita el registro público en Supabase Auth. Crea las cuentas internas desde el panel y agrega cada UUID a `team_members` con su nombre mediante el SQL Editor administrativo.
5. Inicia sesión con esa cuenta. El servidor verifica la identidad y membresía en cada petición. La cookie es HttpOnly, SameSite Strict y Secure en producción. La sesión expira según Supabase; vuelve a iniciar sesión cuando se solicite.

La API valida nuevamente los datos y confirma la escritura antes de cerrar el formulario. UUID estable permite reintentar un guardado. Correo normalizado y teléfono sin separadores tienen restricciones únicas; los duplicados no se fusionan automáticamente. El listado tiene un límite de 5000 registros.

## Pruebas

```sh
node --experimental-strip-types --test tests/validation.test.mjs
npm run lint
npm run build
npm start
```

Verificado: build, TypeScript, ESLint y 10 pruebas unitarias de validación, consentimiento y CSV. Pendiente: pruebas de persistencia y RLS contra Supabase configurado y pruebas de navegador completas a 375/768/1440 px. El esquema no ha sido aplicado a ningún servicio externo.

## Configuraciones pendientes

La entrega de correos y notificación a José Luis aún no está implementada; la interfaz indica que no fueron enviados. Las variables Resend documentan la integración prevista y no activan envíos. Se requiere verificar dominio, implementar outbox/idempotencia y estados de entrega, y obtener autorización para correos de prueba reales. Cualquier correo comercial debe exigir consentimiento explícito.

El aviso de privacidad requiere texto y URL aprobados antes de operar con personas reales. La identidad visual es provisional; el repositorio original estaba vacío y no contenía activos oficiales.

## Vercel

No se realizó ningún despliegue. Tras completar aceptación y recibir autorización, importar este repositorio como proyecto Next.js, configurar variables y URL HTTPS de Supabase Auth, ejecutar build y desplegar. No publicar datos ni secretos en Git. `.env.local` está ignorado; `.env.example` no contiene credenciales.

Rama de desarrollo: `develop/moldtech-leads`. El PR hacia `main` permanece en borrador mientras existan pendientes de aceptación.
