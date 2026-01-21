from enum import Enum
from pydantic import BaseModel


class TicketCategory(str, Enum):
    Tecnico = "Tecnico"
    Facturacion = "Facturacion"
    Comercial = "Comercial"


class TicketSentiment(str, Enum):
    Positivo = "Positivo"
    Neutral = "Neutral"
    Negativo = "Negativo"


class TicketProcessRequest(BaseModel):
    ticket_id: str
    description: str


class TicketProcessResponse(BaseModel):
    ticket_id: str
    category: TicketCategory
    sentiment: TicketSentiment
    processed: bool


class TicketAnalysis(BaseModel):
    category: TicketCategory
    sentiment: TicketSentiment
