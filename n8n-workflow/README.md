# n8n Workflow - Process Ticket

Este workflow procesa tickets de soporte recibidos vía webhook, los clasifica usando la API de Python, y simula el envío de emails para tickets con sentimiento negativo.

## Configuración

**Nota**: Las URLs de la API están hardcodeadas en el workflow porque las variables de entorno en n8n.cloud requieren un plan de pago. Si necesitas cambiar la URL base de la API, edita manualmente el archivo `workflow.json` antes de importarlo.

### URLs Configuradas

El workflow está configurado con las siguientes URLs hardcodeadas:
- **Health endpoint**: `https://ai-powered-support-co-pilot.onrender.com/health`
- **Process ticket endpoint**: `https://ai-powered-support-co-pilot.onrender.com/process-ticket`

### Para Desarrollo Local

Si quieres usar el workflow con una API local, edita el archivo `workflow.json` y reemplaza:
- `https://ai-powered-support-co-pilot.onrender.com` por `http://localhost:8000`

En las líneas 24 y 116 del archivo.

## Importar el Workflow

1. Abre tu instancia de n8n
2. Ve a **Workflows** → **Import from File**
3. Selecciona el archivo `workflow.json`
4. Activa el workflow

## Estructura del Workflow

1. **Webhook**: Recibe POST requests con `ticket_id` y `description`
2. **HTTP Request (Health)**: Hace warm-up llamando al endpoint `/health`
3. **HTTP Request (Process)**: Llama al endpoint `/process-ticket` para clasificar el ticket
4. **If**: Verifica si el sentimiento es "Negativo"
5. **Simulate Email**: Si es negativo, simula el envío de un email de alerta

## Nota sobre Variables de Entorno

Las variables de entorno en n8n.cloud requieren un plan de pago, por lo que este workflow utiliza URLs hardcodeadas. Si tienes acceso a n8n self-hosted o un plan de pago, puedes modificar el workflow para usar variables de entorno editando las URLs en los nodos HTTP Request.
