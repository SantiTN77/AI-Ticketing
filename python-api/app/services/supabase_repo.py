from supabase import Client, create_client

from app.core.config import settings


_client: Client = create_client(
    settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
)


def get_ticket(ticket_id: str) -> dict | None:
    response = (
        _client.table("tickets")
        .select("id, category, sentiment, processed")
        .eq("id", ticket_id)
        .limit(1)
        .execute()
    )
    if getattr(response, "error", None):
        raise RuntimeError("Supabase query failed")
    data = response.data or []
    return data[0] if data else None


def update_ticket(ticket_id: str, category: str, sentiment: str) -> dict:
    payload = {"category": category, "sentiment": sentiment, "processed": True}
    response = _client.table("tickets").update(payload).eq("id", ticket_id).execute()
    if getattr(response, "error", None):
        raise RuntimeError("Supabase update failed")
    data = response.data or []
    if not data:
        raise RuntimeError("Supabase update returned no data")
    return data[0]
