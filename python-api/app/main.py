import logging
from uuid import UUID

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.schemas.tickets import TicketProcessRequest, TicketProcessResponse
from app.services.llm_classifier import LLMError, classify_ticket, ping_gemini
from app.services.supabase_repo import get_ticket, ping_supabase, update_ticket

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("app")


def _parse_origins(raw: str) -> list[str]:
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    return origins


allowed_origins = _parse_origins(settings.ALLOWED_ORIGINS)
if not allowed_origins and settings.APP_ENV != "production":
    allowed_origins = ["http://localhost:5173", "http://localhost:3000"]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id", "")
    response = await call_next(request)
    if request_id:
        response.headers["x-request-id"] = request_id
    logger.info(
        "request completed method=%s path=%s request_id=%s",
        request.method,
        request.url.path,
        request_id,
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("unhandled error path=%s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "internal error"})


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.get("/ready")
def ready() -> dict:
    try:
        ping_supabase()
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=503, detail="supabase unavailable")


@app.post("/process-ticket", response_model=TicketProcessResponse)
def process_ticket(payload: TicketProcessRequest) -> TicketProcessResponse:
    try:
        UUID(payload.ticket_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="ticket_id invalido") from exc

    if not payload.description or not payload.description.strip():
        raise HTTPException(status_code=400, detail="description vacio")

    ticket = get_ticket(payload.ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="ticket no encontrado")

    if ticket.get("processed"):
        logger.info("idempotent_return ticket_id=%s", payload.ticket_id)
        if not ticket.get("category") or not ticket.get("sentiment"):
            raise HTTPException(
                status_code=500,
                detail="ticket procesado sin clasificacion",
            )
        return TicketProcessResponse(
            ticket_id=payload.ticket_id,
            category=ticket["category"],
            sentiment=ticket["sentiment"],
            processed=True,
        )

    logger.info("classify_ticket ticket_id=%s", payload.ticket_id)
    try:
        analysis = classify_ticket(payload.description)
    except LLMError as exc:
        status_info = exc.status_code if exc.status_code is not None else "n/a"
        raise HTTPException(
            status_code=502,
            detail=f"LLM error: {exc.exc_class} ({status_info}) - {exc.message}",
        ) from exc

    try:
        update_ticket(payload.ticket_id, analysis.category, analysis.sentiment)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail="fallo actualizacion supabase"
        ) from exc

    return TicketProcessResponse(
        ticket_id=payload.ticket_id,
        category=analysis.category,
        sentiment=analysis.sentiment,
        processed=True,
    )


@app.get("/debug/gemini")
def debug_gemini() -> dict:
    if settings.APP_ENV == "production":
        raise HTTPException(status_code=404, detail="not found")
    try:
        ping_gemini()
        return {"ok": True}
    except LLMError as exc:
        status_info = exc.status_code if exc.status_code is not None else "n/a"
        return {
            "ok": False,
            "error": f"{exc.exc_class} ({status_info}) - {exc.message}",
        }
