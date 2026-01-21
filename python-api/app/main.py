from uuid import UUID

from fastapi import FastAPI, HTTPException

from app.schemas.tickets import TicketProcessRequest, TicketProcessResponse
from app.services.llm_classifier import LLMError, classify_ticket, ping_gemini
from app.services.supabase_repo import get_ticket, update_ticket

app = FastAPI()


@app.get("/health")
def health() -> dict:
    return {"ok": True}


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
    try:
        ping_gemini()
        return {"ok": True}
    except LLMError as exc:
        status_info = exc.status_code if exc.status_code is not None else "n/a"
        return {
            "ok": False,
            "error": f"{exc.exc_class} ({status_info}) - {exc.message}",
        }
