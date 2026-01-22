# AI-Powered Support 
Co-Pilot

Sistema end-to-end para procesar tickets:
Supabase (DB + realtime) -> n8n (orquestacion) -> Python API (clasificacion con LLM) -> Frontend (UI).

## Live URLs
- Backend API: https://ai-powered-support-co-pilot.onrender.com
- n8n Webhook (production): https://devstm77.app.n8n.cloud/webhook/process-ticket

## Features
- POST /process-ticket: clasifica category + sentiment y actualiza ticket en Supabase
- Idempotencia: si el ticket ya esta procesado, retorna sin recalcular
- Healthcheck: GET /health
- n8n workflow: webhook -> warm-up health -> POST process-ticket -> IF sentiment negativo -> simulate email

## API Endpoints
### GET /health
Respuesta: { "ok": true }

### POST /process-ticket
Body:
{
  "ticket_id": "<uuid>",
  "description": "..."
}

Response:
{
  "ticket_id": "...",
  "category": "Tecnico|Facturacion|...",
  "sentiment": "Negativo|Neutral|Positivo",
  "processed": true
}

## Run locally (backend)
```bash
cd python-api
python -m venv .venv
# Windows:
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## Frontend
### Env vars
- VITE_SUPABASE_URL=
- VITE_SUPABASE_ANON_KEY=
- VITE_N8N_WEBHOOK_URL=https://devstm77.app.n8n.cloud/webhook/process-ticket

### Run locally
```bash
cd frontend
npm install
npm run dev
```

### Probar flujo
1) Crea un ticket en Supabase (Table Editor) y copia el UUID.
2) En la UI, pega UUID + description y presiona Procesar.
3) Realtime debe actualizar la lista sin refrescar.

## Configuracion de n8n
El workflow de n8n tiene las URLs de la API hardcodeadas (las variables de entorno requieren plan de pago en n8n.cloud). El workflow esta configurado para usar `https://ai-powered-support-co-pilot.onrender.com` por defecto.

Para desarrollo local, edita `workflow.json` y reemplaza las URLs antes de importar.

Ver `n8n-workflow/README.md` para instrucciones detalladas.
