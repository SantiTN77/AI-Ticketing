import logging
from dataclasses import dataclass

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.exceptions import OutputParserException
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import settings
from app.schemas.tickets import TicketAnalysis

logger = logging.getLogger(__name__)


@dataclass
class LLMError(Exception):
    exc_class: str
    message: str
    status_code: int | None = None
    error_code: str | None = None
    request_id: str | None = None


def _truncate(value: str, limit: int = 300) -> str:
    return value if len(value) <= limit else value[:limit] + "..."


def _extract_error_fields(exc: Exception) -> dict:
    status_code = getattr(exc, "status_code", None) or getattr(exc, "http_status", None)
    error_code = getattr(exc, "code", None) or getattr(exc, "error_code", None)
    request_id = getattr(exc, "request_id", None)
    return {
        "status_code": status_code,
        "error_code": error_code,
        "request_id": request_id,
    }


def _log_exception(exc: Exception, context: str) -> None:
    fields = _extract_error_fields(exc)
    logger.exception(
        "LLM error %s: %s | message=%s status_code=%s error_code=%s request_id=%s",
        context,
        exc.__class__.__name__,
        _truncate(str(exc)),
        fields.get("status_code"),
        fields.get("error_code"),
        fields.get("request_id"),
    )


def _is_model_error(exc: Exception) -> bool:
    message = str(exc).lower()
    error_code = str(getattr(exc, "code", "") or "").lower()
    return (
        "model_not_found" in message
        or "not authorized" in message
        or "not_authorized" in message
        or "model not found" in message
        or "model_not_found" in error_code
    )


def _build_llm(model: str) -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model=model,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0,
    )


def _invoke_structured(description: str, model: str) -> TicketAnalysis:
    prompt = (
        "Clasifica category y sentiment del ticket. "
        "Usa category en {Tecnico, Facturacion, Comercial} y sentiment en "
        "{Positivo, Neutral, Negativo}. Si dudas: sentiment=Neutral."
    )
    structured = _build_llm(model).with_structured_output(TicketAnalysis)
    return structured.invoke(
        [SystemMessage(content=prompt), HumanMessage(content=description)]
    )


def classify_ticket(description: str) -> TicketAnalysis:
    model = settings.GEMINI_MODEL
    try:
        return _invoke_structured(description, model)
    except OutputParserException as exc:
        _log_exception(exc, "structured_output_parse")
        try:
            return _invoke_structured(description, model)
        except Exception as exc2:
            _log_exception(exc2, "structured_output_parse_retry")
            fields = _extract_error_fields(exc2)
            raise LLMError(
                exc_class=exc2.__class__.__name__,
                message=_truncate(str(exc2)),
                status_code=fields.get("status_code"),
                error_code=fields.get("error_code"),
                request_id=fields.get("request_id"),
            ) from exc2
    except Exception as exc:
        _log_exception(exc, "llm_call")
        fallback = settings.GEMINI_MODEL_FALLBACK
        if _is_model_error(exc) and model != fallback:
            try:
                return _invoke_structured(description, fallback)
            except Exception as exc2:
                _log_exception(exc2, "llm_call_fallback")
                fields = _extract_error_fields(exc2)
                raise LLMError(
                    exc_class=exc2.__class__.__name__,
                    message=_truncate(str(exc2)),
                    status_code=fields.get("status_code"),
                    error_code=fields.get("error_code"),
                    request_id=fields.get("request_id"),
                ) from exc2
        fields = _extract_error_fields(exc)
        raise LLMError(
            exc_class=exc.__class__.__name__,
            message=_truncate(str(exc)),
            status_code=fields.get("status_code"),
            error_code=fields.get("error_code"),
            request_id=fields.get("request_id"),
        ) from exc


def ping_gemini() -> None:
    model = settings.GEMINI_MODEL
    try:
        _build_llm(model).invoke("ping")
        return
    except Exception as exc:
        _log_exception(exc, "ping")
        fallback = settings.GEMINI_MODEL_FALLBACK
        if _is_model_error(exc) and model != fallback:
            _build_llm(fallback).invoke("ping")
            return
        fields = _extract_error_fields(exc)
        raise LLMError(
            exc_class=exc.__class__.__name__,
            message=_truncate(str(exc)),
            status_code=fields.get("status_code"),
            error_code=fields.get("error_code"),
            request_id=fields.get("request_id"),
        ) from exc
