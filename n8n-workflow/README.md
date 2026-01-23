# n8n Workflow - Process Ticket

Este workflow procesa tickets de soporte recibidos via webhook, los clasifica usando la API de Python, simula el envio de email si el sentimiento es negativo y envia una alerta a Discord.

## Configuracion

**Nota**: Las URLs de la API estan hardcodeadas en el workflow porque las variables de entorno en n8n.cloud requieren un plan de pago. Si necesitas cambiar la URL base de la API, edita manualmente el archivo `workflow.json` antes de importarlo.

### URLs configuradas

El workflow esta configurado con las siguientes URLs hardcodeadas:
- **Health endpoint**: `https://ai-powered-support-co-pilot.onrender.com/health`
- **Process ticket endpoint**: `https://ai-powered-support-co-pilot.onrender.com/process-ticket`

### Para desarrollo local

Si quieres usar el workflow con una API local, edita el archivo `workflow.json` y reemplaza:
- `https://ai-powered-support-co-pilot.onrender.com` por `http://localhost:8000`

## Configurar Discord (Incoming Webhook)

1. En tu servidor de Discord: **Server Settings** -> **Integrations** -> **Webhooks**.
2. Crea un webhook nuevo y copia la URL.
3. En n8n, abre el nodo **Discord Alert** y pega la URL en **Webhook URL**.
4. Guarda y activa el workflow.

> En el repo, el workflow usa el placeholder `<DISCORD_WEBHOOK_URL>` por seguridad.

## Importar el workflow

1. Abre tu instancia de n8n.
2. Ve a **Workflows** -> **Import from File**.
3. Selecciona el archivo `workflow.json`.
4. Activa el workflow.

## Estructura del workflow

1. **Webhook**: recibe POST requests con `ticket_id` y `description`.
2. **HTTP Request (Health)**: hace warm-up llamando al endpoint `/health`.
3. **If Health OK**: si el backend esta listo, continua; si no, retorna error controlado.
4. **HTTP Request (Process)**: llama al endpoint `/process-ticket` para clasificar el ticket.
5. **If HTTP Error**: retorna error estandar si la API falla.
6. **If**: verifica si el sentimiento es "Negativo".
7. **Simulate Email**: si es negativo, simula el envio de un email.
8. **Discord Alert**: envia alerta a Discord si el sentimiento es negativo.

## Nota sobre variables de entorno

Las variables de entorno en n8n.cloud requieren un plan de pago, por lo que este workflow utiliza URLs hardcodeadas. Si tienes acceso a n8n self-hosted o un plan de pago, puedes modificar el workflow para usar variables de entorno editando las URLs en los nodos HTTP Request.
