import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type ProcessSuccess = {
  ok: true
  ticket_id: string
  category: string
  sentiment: string
  processed: boolean
}

type ProcessError = {
  ok: false
  status?: number
  error?: string
}

type ProcessResult = ProcessSuccess | ProcessError

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function TicketForm() {
  const [ticketId, setTicketId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ProcessResult | null>(null)

  const isValidUuid = useMemo(() => UUID_REGEX.test(ticketId.trim()), [ticketId])

  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    setCreateError('')
    setResult(null)

    if (!ticketId.trim() || !description.trim()) {
      setError('Completa ticket_id y description.')
      return
    }

    if (!isValidUuid) {
      setError('El ticket_id no es un UUID valido.')
      return
    }

    if (!webhookUrl) {
      setError('Falta VITE_N8N_WEBHOOK_URL en env.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketId.trim(),
          description: description.trim(),
        }),
      })

      const bodyText = await response.text()
      try {
        const parsed = JSON.parse(bodyText) as ProcessResult
        if ('ok' in parsed && parsed.ok === false) {
          const status = parsed.status ?? response.status
          const message = parsed.error || 'Error en webhook'
          let finalMessage = `Error ${status}: ${message}`
          if (status === 404) {
            finalMessage +=
              '. El ticket_id debe existir en Supabase o usa Crear ticket.'
          }
          setError(finalMessage)
          return
        }

        if ('ok' in parsed && parsed.ok === true) {
          setResult(parsed)
          return
        }

        if (!response.ok) {
          setError(`Error ${response.status}: ${bodyText}`)
          return
        }

        setResult(parsed)
      } catch {
        setError('Respuesta no es JSON valido.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de red'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTicket() {
    setCreateError('')
    setResult(null)

    if (!description.trim()) {
      setCreateError('Agrega una description para crear el ticket.')
      return
    }

    setCreating(true)
    try {
      const { data, error: insertError } = await supabase
        .from('tickets')
        .insert({ description: description.trim(), processed: false })
        .select('id')
        .single()

      if (insertError || !data?.id) {
        setCreateError('No se pudo crear el ticket. Intenta de nuevo.')
        return
      }

      setTicketId(data.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear ticket'
      setCreateError(message)
    } finally {
      setCreating(false)
    }
  }

  const sentiment = result && 'ok' in result && result.ok ? result.sentiment : null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">
        Procesar ticket
      </h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ticket_id
          </label>
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="UUID del ticket"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
          {ticketId && !isValidUuid && (
            <p className="text-xs text-rose-600 mt-1">
              UUID invalido. Ej: 123e4567-e89b-12d3-a456-426614174000
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe el problema"
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
        >
          {loading ? 'Procesando...' : 'Procesar'}
        </button>
        <button
          type="button"
          onClick={handleCreateTicket}
          disabled={creating || Boolean(ticketId.trim())}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition disabled:opacity-60"
        >
          {creating ? 'Creando...' : 'Crear ticket'}
        </button>
      </form>

      {createError && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {createError}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {result && 'ok' in result && result.ok && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Resultado</span>
            {sentiment === 'Negativo' && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                Alerta: Negativo
              </span>
            )}
          </div>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-slate-700">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
