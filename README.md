# AI-Powered Support Co-Pilot

Sistema capaz de recibir tickets de soporte, procesarlos mediante agentes de IA para categorizarlos y analizar su sentimiento, y visualizarlos en tiempo real en un dashboard.

## Estructura del Proyecto

```
/supabase          - Configuración y migraciones de base de datos
/python-api        - Backend FastAPI
/frontend          - Frontend React + TypeScript + Vite + Tailwind
/n8n-workflow      - Flujos de trabajo de automatización
```

## Requisitos Previos

- Node.js 18+ y npm
- Python 3.11+
- Git

## Configuración

### Backend (Python API)

1. Navegar a la carpeta `python-api`:
```bash
cd python-api
```

2. Crear un entorno virtual:
```bash
python -m venv venv
```

3. Activar el entorno virtual:
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

4. Instalar dependencias:
```bash
pip install -r requirements.txt
```

5. Copiar `.env.example` a `.env` y configurar las variables:
```bash
copy .env.example .env
```

6. Ejecutar el servidor:
```bash
uvicorn app.main:app --reload
```

El servidor estará disponible en `http://localhost:8000`

### Frontend

1. Navegar a la carpeta `frontend`:
```bash
cd frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Copiar `.env.example` a `.env` y configurar las variables:
```bash
copy .env.example .env
```

4. Ejecutar el servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Desarrollo

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`
- API Docs: `http://localhost:8000/docs`

## Próximos Pasos

- [ ] Implementar esquemas de base de datos en Supabase
- [ ] Crear endpoints para tickets de soporte
- [ ] Integrar agentes de IA para categorización y análisis de sentimiento
- [ ] Desarrollar dashboard en tiempo real
- [ ] Configurar flujos de trabajo en n8n



