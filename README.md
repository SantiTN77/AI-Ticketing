# AI Ticketing – Full-Stack AI Engineer Challenge

Sistema end-to-end para procesar tickets:
Supabase (DB + realtime) → n8n (orquestación) → Python API (clasificación con LLM) → Frontend (UI).

## Live URLs
- Backend API: https://ai-powered-support-co-pilot.onrender.com
- n8n Webhook (production): https://devstm77.app.n8n.cloud/webhook/process-ticket

## Features
- POST /process-ticket: clasifica category + sentiment y actualiza ticket en Supabase
- Idempotencia: si el ticket ya está procesado, retorna sin recalcular
- Healthcheck: GET /health
- n8n workflow: webhook → warm-up health → POST process-ticket → IF sentiment negativo → simulate email

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
  "sentiment": "Negativo|Neutro|Positivo",
  "processed": true
}

## Run locally (backend)
```bash
cd python-api
python -m venv .venv
# Windows:
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
