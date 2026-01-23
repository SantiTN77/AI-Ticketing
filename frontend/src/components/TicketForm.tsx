import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Copy, Mail } from 'lucide-react'
import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Modal } from './ui/Modal'
import { useToast } from './ui/Toast'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type ProcessSuccess = {
  ok: true
  ticket_id: string
  category: string
  sentiment: string
  processed: boolean
  email_simulated?: boolean
  subject?: string
  body?: string
}

type ProcessError = {
  ok: false
  status?: number
  error?: string
}

type ProcessResult = ProcessSuccess | ProcessError

type ResultState =
  | { status: 'success'; data: ProcessSuccess }
  | { status: 'error'; statusCode?: number; message: string }
  | null

export function TicketForm() {
  const { addToast } = useToast()
  const [ticketId, setTicketId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState('')
  const [result, setResult] = useState<ResultState>(null)
  const [openCreate, setOpenCreate] = useState(false)
  const [createDescription, setCreateDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const isValidUuid = useMemo(() => UUID_REGEX.test(ticketId.trim()), [ticketId])
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL

  const resetResult = () => setResult(null)

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      addToast({
        title: 'ID copiado',
        description: 'Ya puedes pegarlo donde quieras.',
        variant: 'success',
      })
    } catch {
      addToast({
        title: 'No se pudo copiar',
        description: 'Copia manualmente el ID.',
        variant: 'error',
      })
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    resetResult()
    setInfo('')

    if (!ticketId.trim() || !description.trim()) {
      setResult({
        status: 'error',
        statusCode: 400,
        message: 'Completa el ID y la descripcion antes de procesar.',
      })
      addToast({
        title: 'Faltan datos',
        description: 'Completa el ID y la descripcion.',
        variant: 'error',
      })
      return
    }

    if (!isValidUuid) {
      setResult({
        status: 'error',
        statusCode: 400,
        message: 'El ID no es un UUID valido.',
      })
      addToast({
        title: 'UUID invalido',
        description: 'Verifica el formato del ID del ticket.',
        variant: 'error',
      })
      return
    }

    if (!webhookUrl) {
      setResult({
        status: 'error',
        message: 'Falta VITE_N8N_WEBHOOK_URL en las variables de entorno.',
      })
      addToast({
        title: 'Falta configuracion',
        description: 'Agrega VITE_N8N_WEBHOOK_URL en .env.local.',
        variant: 'error',
      })
      return
    }

    const maxAttempts = 3
    const shouldRetry = (status?: number, message?: string) => {
      if (!status) return false
      if (status >= 500) return true
      if (message && message.includes('No item to return was found')) return true
      return false
    }

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    setLoading(true)
    let lastRetryableStatus: number | undefined
    let lastRetryableMessage = ''
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (attempt > 1) {
          setInfo(`Reintentando... (${attempt}/${maxAttempts})`)
          await sleep(1500 * attempt)
        }

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
            if (shouldRetry(status, message) && attempt < maxAttempts) {
              lastRetryableStatus = status
              lastRetryableMessage = message
              continue
            }
            if (shouldRetry(status, message)) {
              lastRetryableStatus = status
              lastRetryableMessage = message
              break
            }
            const finalMessage = status === 404
              ? `Error ${status}: ${message}. El ticket_id debe existir en Supabase o usa Crear ticket.`
              : `Error ${status}: ${message}`
            setResult({ status: 'error', statusCode: status, message: finalMessage })
            addToast({
              title: `Error ${status}`,
              description: message,
              variant: 'error',
            })
            return
          }

          if ('ok' in parsed && parsed.ok === true) {
            setResult({ status: 'success', data: parsed })
            addToast({
              title: 'Ticket procesado',
              description: 'La clasificacion se actualizo en Supabase.',
              variant: 'success',
            })
            return
          }

          if (!response.ok) {
            if (shouldRetry(response.status, bodyText) && attempt < maxAttempts) {
              lastRetryableStatus = response.status
              lastRetryableMessage = bodyText
              continue
            }
            if (shouldRetry(response.status, bodyText)) {
              lastRetryableStatus = response.status
              lastRetryableMessage = bodyText
              break
            }
            setResult({
              status: 'error',
              statusCode: response.status,
              message: `Error ${response.status}: ${bodyText}`,
            })
            addToast({
              title: `Error ${response.status}`,
              description: bodyText,
              variant: 'error',
            })
            return
          }

          setResult({ status: 'success', data: parsed as ProcessSuccess })
          addToast({
            title: 'Ticket procesado',
            description: 'La clasificacion se actualizo en Supabase.',
            variant: 'success',
          })
          return
        } catch {
          if (shouldRetry(response.status, bodyText) && attempt < maxAttempts) {
            lastRetryableStatus = response.status
            lastRetryableMessage = bodyText
            continue
          }
          if (shouldRetry(response.status, bodyText)) {
            lastRetryableStatus = response.status
            lastRetryableMessage = bodyText
            break
          }
          setResult({ status: 'error', message: 'Respuesta no es JSON valido.' })
          addToast({
            title: 'Respuesta invalida',
            description: 'El webhook devolvio un JSON no valido.',
            variant: 'error',
          })
          return
        }
      }

      if (lastRetryableMessage) {
        setInfo('Procesando en segundo plano... (Render puede tardar ~50s)')
      }
      const pollAttempts = 10
      for (let i = 0; i < pollAttempts; i += 1) {
        await sleep(3000)
        const { data } = await supabase
          .from('tickets')
          .select('id, category, sentiment, processed')
          .eq('id', ticketId.trim())
          .single()

        if (data?.processed) {
          setResult({
            status: 'success',
            data: {
              ok: true,
              ticket_id: data.id,
              category: data.category,
              sentiment: data.sentiment,
              processed: data.processed,
            },
          })
          addToast({
            title: 'Ticket procesado',
            description: 'Actualizado via Supabase realtime.',
            variant: 'success',
          })
          return
        }
      }

      if (lastRetryableMessage) {
        const statusText = lastRetryableStatus ? `Error ${lastRetryableStatus}` : 'Error'
        setResult({ status: 'error', statusCode: lastRetryableStatus, message: `${statusText}: ${lastRetryableMessage}` })
        addToast({
          title: statusText,
          description: lastRetryableMessage,
          variant: 'error',
        })
      } else {
        setResult({ status: 'error', message: 'No se pudo procesar el ticket. Intenta de nuevo.' })
        addToast({
          title: 'No se pudo procesar',
          description: 'Intenta nuevamente en unos segundos.',
          variant: 'error',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de red'
      setResult({ status: 'error', message })
      addToast({
        title: 'Error de red',
        description: message,
        variant: 'error',
      })
    } finally {
      setLoading(false)
      setInfo('')
    }
  }

  async function handleCreateTicket() {
    if (!createDescription.trim()) {
      addToast({
        title: 'Descripcion requerida',
        description: 'Agrega una descripcion para crear el ticket.',
        variant: 'error',
      })
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('tickets')
        .insert({ description: createDescription.trim(), processed: false })
        .select('id')
        .single()

      if (error || !data?.id) {
        addToast({
          title: 'No se pudo crear',
          description: 'Revisa las politicas RLS o tu conexion.',
          variant: 'error',
        })
        return
      }

      setTicketId(data.id)
      setDescription(createDescription.trim())
      setOpenCreate(false)
      addToast({
        title: 'Ticket creado',
        description: 'UUID copiado en el formulario.',
        variant: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear ticket'
      addToast({
        title: 'No se pudo crear',
        description: message,
        variant: 'error',
      })
    } finally {
      setCreating(false)
    }
  }

  const sentiment = result?.status === 'success' ? result.data.sentiment : null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Acciones</h2>
          <p className="mt-1 text-xs text-slate-500">
            Crea y procesa tickets desde el webhook n8n.
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
          Demo
        </span>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">ID del ticket (UUID)</label>
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="123e4567-e89b-12d3-a456-426614174000"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Si no tienes ID, usa Crear ticket.
          </p>
          {ticketId && !isValidUuid && (
            <p className="mt-1 text-xs text-rose-600">UUID invalido. Verifica el formato.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Descripcion del problema</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: No puedo iniciar sesion, error 500"
            rows={4}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {loading ? 'Procesando...' : 'Procesar'}
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateDescription(description)
              setOpenCreate(true)
            }}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Crear ticket
          </button>
        </div>

        {info && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            {info}
          </div>
        )}
      </form>

      <motion.div layout className="mt-6">
        {result && result.status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-semibold">Procesado</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  {result.data.category}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  sentiment === 'Negativo'
                    ? 'bg-rose-100 text-rose-700'
                    : sentiment === 'Positivo'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-700'
                }`}>
                  {sentiment}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">Ticket ID:</span>
              <span className="rounded-md bg-white px-2 py-1 font-mono text-[11px]">
                {result.data.ticket_id}
              </span>
              <button
                type="button"
                onClick={() => copyValue(result.data.ticket_id)}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
              >
                <Copy className="h-3.5 w-3.5" />
                Copiar
              </button>
            </div>

            {result.data.email_simulated && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <div className="flex items-center gap-2 font-semibold">
                  <Mail className="h-4 w-4" />
                  Email simulado enviado
                </div>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer text-amber-700">
                    Ver detalle del correo
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="font-semibold">Asunto</p>
                      <p className="text-amber-900">{result.data.subject || 'Alerta de ticket negativo'}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Mensaje</p>
                      <p className="text-amber-900">{result.data.body || 'Se detecto un ticket negativo.'}</p>
                    </div>
                  </div>
                </details>
              </div>
            )}
          </motion.div>
        )}

        {result && result.status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5"
          >
            <div className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-semibold">Error</span>
            </div>
            <p className="mt-2 text-xs text-rose-700">
              {result.message}
            </p>
          </motion.div>
        )}
      </motion.div>

      <Modal open={openCreate} title="Crear ticket" onClose={() => setOpenCreate(false)}>
        <p className="text-xs text-slate-500">
          Crea un ticket en Supabase para obtener un UUID.
        </p>
        <textarea
          value={createDescription}
          onChange={(e) => setCreateDescription(e.target.value)}
          rows={4}
          placeholder="Describe el problema"
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpenCreate(false)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreateTicket}
            disabled={creating}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {creating ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
