# AI-Powered Support Co-Pilot

Sistema **end-to-end** para procesar tickets con IA y ver cambios en **tiempo real**:

**Supabase (Postgres + Realtime)** → **n8n (orquestación)** → **Python API (FastAPI + Gemini LLM)** → **Frontend (React 18 + TS + Vite + Tailwind)**

---

## Live URLs (obligatorio)

- **Dashboard (Vercel):** https://ai-ticketing-ten.vercel.app/
- **Python API (Render):** https://ai-powered-support-co-pilot.onrender.com/health)
- **OpenAPI / Swagger:** https://ai-powered-support-co-pilot.onrender.com/docs

---

## Arquitectura (visión rápida)

1. El usuario crea un ticket en el dashboard (se inserta en Supabase).
2. El usuario procesa el ticket (dashboard envía `ticket_id` + `description` al Webhook de n8n).
3. n8n hace warm-up (`GET /health`) y llama a la API (`POST /process-ticket`).
4. La API clasifica con **Gemini** (categoría + sentimiento) y actualiza el ticket en Supabase.
5. Supabase Realtime actualiza la tabla en UI sin refrescar.
6. Si el sentimiento es **Negativo**, n8n ejecuta un “email simulado” (y puede incluir un PLUS: alerta a Discord,
Servidor para prueba alerta Discord: https://discord.gg/N5UCkppd)

---

## Features clave (evaluación)

- **Funcionalidad End-to-End:** ticket entra → se clasifica → se actualiza en DB → se visualiza en UI realtime.
- **Calidad del microservicio (FastAPI):**
  - Validaciones claras (400/404/422).
  - Manejo de errores controlado (502 cuando el proveedor LLM falla).
  - Tipado (Pydantic) + salida estructurada.
  - **Idempotencia:** si `processed=true`, no recalcula ni llama al LLM.
- **Dominio ecosistema:** Supabase + n8n + frontend integrados.
- **DevOps básico:** API desplegada en Render, Dashboard en Vercel.

---

## API Endpoints

### `GET /health`
**Respuesta**
```json
{ "ok": true }

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
- 400: UUID invalido
- 404: ticket no encontrado (no existe en Supabase)
- 502: fallo del LLM / proveedor externo

---

## Probar la API (rapido)

**Health**
```bash
curl -s https://ai-powered-support-co-pilot.onrender.com/health
```

**Procesar ticket (requiere UUID real existente en Supabase)**
```bash
curl -X POST https://ai-powered-support-co-pilot.onrender.com/process-ticket \
  -H "Content-Type: application/json" \
  -d "{\"ticket_id\":\"<UUID_REAL>\",\"description\":\"No puedo iniciar sesion, error 500\"}"
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

1) Crear ticket (modal “Crear ticket”) con descripcion.  
2) Procesar (envia ticket_id + description al webhook de n8n).  
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

## Prompt Engineering (clasificacion) (obligatorio)

Estrategia aplicada para clasificacion category + sentiment:

- Structured output: salida validada con Pydantic schema (evita texto libre).
- Taxonomia cerrada: Enums para categorias y sentimientos, reduce alucinaciones.
- Prompt corto y estricto: reglas claras + “responde solo con el schema”.
- Validacion + manejo de errores: si parsing/validacion falla -> error controlado.
- Idempotencia: si processed=true no se llama al LLM; se retorna lo almacenado.

---

## Deploy notes

- Backend: Render
- Frontend: Vercel
- Orquestacion: n8n Cloud

---

## Configuracion de n8n

En n8n Cloud, el workflow usa la API en Render (hardcode) porque variables globales pueden requerir plan pago.
Por defecto llama a:

```
https://ai-powered-support-co-pilot.onrender.com
```

Para desarrollo local: edita n8n-workflow/workflow.json y reemplaza URLs antes de importar.

Ver n8n-workflow/README.md para instrucciones detalladas.
