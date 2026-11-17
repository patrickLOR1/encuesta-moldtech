# Prueba controlada de Gmail SMTP (pendiente de autorización)

Este procedimiento se ejecutará únicamente en un Preview conectado a `moldtech_calendar_qa`. No utiliza prospectos reales ni habilita producción.

1. Rotar la contraseña de aplicación expuesta antes de uso con prospectos reales. Actualizar únicamente la variable Sensitive en Vercel; no escribirla en Git, terminal ni chat. La variable existente no se ha leído ni modificado en esta integración.
2. Confirmar el destinatario interno autorizado y acordar una fecha futura, hora de Ciudad de México y duración de 30 minutos. No reutilizar filas arbitrarias de la cola QA.
3. Comprobar `/api/integrations/status` con sesión válida: configuración Gmail válida, contraseña presente (solo booleano), `enabled=false`, base de QA verificada mediante login de una cuenta exclusiva de QA.
4. Tras autorización, activar SMTP únicamente para la rama de Preview de la prueba y redeplegar. Mantener Production deshabilitado.
5. Crear exactamente un prospecto ficticio con el correo interno autorizado. Confirmar explícitamente horario y correo. Guardar una vez; registrar UUID de reunión, UID y SEQUENCE 0.
6. Confirmar el estado persistente `sent` solo si Gmail acepta el mensaje. Si queda `unknown`, no reintentar: reconciliar con el buzón y registros del proveedor.
7. El destinatario confirma recepción, abre ICS e incorpora el evento en Gmail/Outlook. Registrar la evidencia por separado de la aceptación SMTP.
8. Reprogramar esa misma reunión una vez. Confirmar UID idéntico, SEQUENCE 1 y METHOD REQUEST, y verificar la actualización recibida.
9. Cancelar esa misma reunión una vez con confirmación. Verificar UID idéntico, SEQUENCE 2, METHOD CANCEL y recepción de la cancelación.
10. Desactivar SMTP del Preview y redeplegar. Registrar resultados en `MOLDTECH_SMTP_CALENDAR_QA.md`. No habilitar automatización comercial hasta aprobación de privacidad y cierre de las verificaciones.

La prueba completa consta de tres mensajes deliberados: una invitación inicial, una actualización y una cancelación. La primera autorización puede limitarse a la invitación inicial; no ejecutar los otros dos pasos sin autorización correspondiente.

Referencias oficiales: [Gmail SMTP](https://developers.google.com/workspace/gmail/imap/imap-smtp), [Nodemailer SMTP](https://nodemailer.com/smtp), [iCalendar en Nodemailer](https://nodemailer.com/message/calendar-events).
