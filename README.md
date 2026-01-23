# AI-Powered Support Co-Pilot

Sistema **end-to-end** para procesar tickets:

**Supabase (Postgres + Realtime)** → **n8n (orquestación)** → **Python API (FastAPI + LLM)** → **Frontend (React/Vite Dashboard)**

---

## Live URLs (obligatorio)

- **Dashboard (Vercel):** https://ai-ticketing-ten.vercel.app/
- **Python API (Render):** https://ai-powered-support-co-pilot.onrender.com

---

## Arquitectura (visión rápida)

1. El usuario crea un ticket en el dashboard (Supabase).
2. El dashboard envía `ticket_id` + `description` al **Webhook de n8n**.
3. n8n llama a la **API** `POST /process-ticket`.
4. La API clasifica (categoría + sentimiento) con LLM y actualiza el ticket en Supabase.
5. Supabase Realtime actualiza la tabla en UI sin refrescar.
6. Si sentimiento = **Negativo**, n8n ejecuta “email simulado”.

---

## Estructura del repositorio (obligatorio)

- `/supabase` → `setup.sql`
- `/python-api` → FastAPI + `requirements.txt` (+ `Dockerfile` si aplica)
- `/n8n-workflow` → `workflow.json` (sin credenciales) + docs
- `/frontend` → dashboard (React 18 + TypeScript + Vite + Tailwind)

---

## Features

- **POST `/process-ticket`**: clasifica `category` + `sentiment` y actualiza el ticket en Supabase.
- **Idempotencia**: si `processed=true`, retorna el resultado sin recalcular.
- **Healthcheck**: **GET `/health`**.
- **n8n workflow**: Webhook → (opcional warm-up health) → POST process-ticket → IF `sentiment=Negativo` → simulate email.

---

## API Endpoints

### `GET /health`

**Response**
```json
{ "ok": true }
```

### `POST /process-ticket`

**Body**
```json
{ "ticket_id": "<uuid>", "description": "..." }
```

**Response (200)**
```json
{
  "ticket_id": "<uuid>",
  "category": "Tecnico|Facturacion|Comercial",
  "sentiment": "Negativo|Neutral|Positivo",
  "processed": true
}
```

**Errores comunes**
- 400: UUID inválido
- 404: ticket no encontrado (no existe en Supabase)
- 502: fallo del LLM / proveedor externo

---

## Probar la API (rápido)

**Health**
```bash
curl -s https://ai-powered-support-co-pilot.onrender.com/health
```

**Procesar ticket (requiere UUID real existente en Supabase)**
```bash
curl -X POST https://ai-powered-support-co-pilot.onrender.com/process-ticket \
  -H "Content-Type: application/json" \
  -d "{\"ticket_id\":\"<UUID_REAL>\",\"description\":\"No puedo iniciar sesión, error 500\"}"
```

---

## Frontend

### Variables de entorno
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_N8N_WEBHOOK_URL=https://devstm77.app.n8n.cloud/webhook/process-ticket
```

### Run local
```bash
cd frontend
npm install
npm run dev
```

---

## Backend (local)
```bash
cd python-api
python -m venv .venv
# Windows:
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

---

## Demo paso a paso

1) Crear ticket (modal “Crear ticket”) con descripción.  
2) Procesar (envía ticket_id + description al webhook de n8n).  
3) Ver realtime update en la tabla sin refrescar.  
4) Reprocesar el mismo ticket para validar idempotencia (processed=true).

---

## Contrato de respuesta del Webhook (n8n)

**Success**
```json
{ "ok": true, "ticket_id": "...", "category": "...", "sentiment": "...", "processed": true }
```

**Error**
```json
{ "ok": false, "status": 400, "error": "mensaje" }
```

---

## Prompt Engineering (clasificación) (obligatorio)

Estrategia aplicada para clasificación category + sentiment:

- Structured output: salida validada con Pydantic schema (evita texto libre).
- Taxonomía cerrada: Enums para categorías y sentimientos, reduce alucinaciones.
- Prompt corto y estricto: reglas claras + “responde solo con el schema”.
- Validación + manejo de errores: si parsing/validación falla → error controlado.
- Idempotencia: si processed=true no se llama al LLM; se retorna lo almacenado.

---

## Deploy notes

- Backend: Render
- Frontend: Vercel
- Orquestación: n8n Cloud

---

## Configuración de n8n

En n8n Cloud, el workflow usa la API en Render (hardcode) porque variables globales pueden requerir plan pago.
Por defecto llama a:

```
https://ai-powered-support-co-pilot.onrender.com
```

Para desarrollo local: edita n8n-workflow/workflow.json y reemplaza URLs antes de importar.

Ver n8n-workflow/README.md para instrucciones detalladas.
