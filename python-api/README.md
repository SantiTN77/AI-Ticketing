# Backend (FastAPI)

## Run local
```powershell
cd python-api
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## Env vars
Required:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- GEMINI_API_KEY (or GOOGLE_API_KEY)

Optional:
- GEMINI_MODEL (default: gemini-2.5-flash)
- GEMINI_MODEL_FALLBACK (default: gemini-2.0-flash)
- ALLOWED_ORIGINS (comma-separated)
- APP_ENV (development|production)

## Quick test (PowerShell)
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/health -Method Get | ConvertTo-Json -Compress

$body = @{ ticket_id = "<uuid>"; description = "No puedo iniciar sesión" } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8000/process-ticket -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Compress
```

## Render
Command:
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set env vars in Render (no .env file in prod).
