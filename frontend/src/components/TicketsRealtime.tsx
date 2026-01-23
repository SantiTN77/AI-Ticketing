import { Copy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../utils/date'
import { useToast } from './ui/Toast'

type TicketRow = {
  id: string
  description?: string | null
  category?: string | null
  sentiment?: string | null
  processed?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

const MAX_ITEMS = 20

async function selectTickets(
  select: string,
): Promise<{ rows: TicketRow[] | null; error?: string }> {
  const { data, error } = await supabase.from('tickets').select(select).limit(MAX_ITEMS)
  if (error || !data) {
    return { rows: null, error: error?.message || 'No data' }
  }
  const rows = Array.isArray(data) ? (data as unknown as TicketRow[]) : []
  return { rows }
}

async function fetchTickets(): Promise<{ rows: TicketRow[]; error?: string }> {
  const attempts = [
    'id, description, category, sentiment, processed, updated_at, created_at',
    'id, description, category, sentiment, processed, created_at',
    'id, description, category, sentiment, processed',
  ]

  let lastError = ''
  for (const select of attempts) {
    const { rows, error } = await selectTickets(select)
    if (rows) {
      const sorted = [...rows].sort((a, b) => {
        const aDate = a.updated_at || a.created_at || ''
        const bDate = b.updated_at || b.created_at || ''
        if (!aDate && !bDate) {
          return b.id.localeCompare(a.id)
        }
        return bDate.localeCompare(aDate)
      })
      return { rows: sorted }
    }
    if (error) {
      lastError = error
    }
  }

  return { rows: [], error: lastError || 'No se pudo cargar tickets.' }
}

export function TicketsRealtime() {
  const { addToast } = useToast()
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchId, setSearchId] = useState('')
  const [sentimentFilter, setSentimentFilter] = useState('todos')

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)
      setError('')
      const { rows, error: loadError } = await fetchTickets()
      if (isMounted) {
        setTickets(rows)
        if (loadError) {
          setError('No se pudieron cargar tickets. Revisa permisos o columnas.')
        }
        setLoading(false)
      }
    }

    load()

    const channel = (supabase.channel('tickets-changes') as any)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'tickets' },
        (payload: any) => {
          const row = (payload?.new || payload?.old) as TicketRow
          if (!row?.id) return
          setTickets((current) => {
            const existingIndex = current.findIndex((item) => item.id === row.id)
            const updated = [...current]
            if (existingIndex >= 0) {
              updated[existingIndex] = { ...updated[existingIndex], ...row }
            } else {
              updated.unshift(row)
            }
            return updated.slice(0, MAX_ITEMS)
          })
        },
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Realtime no disponible. Revisa politicas o conexion.')
        }
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredTickets = useMemo(() => {
    const normalizedSearch = searchId.trim().toLowerCase()
    return tickets.filter((ticket) => {
      const matchSentiment =
        sentimentFilter === 'todos' ||
        (ticket.sentiment || '').toLowerCase() === sentimentFilter
      const matchSearch =
        !normalizedSearch || ticket.id.toLowerCase().includes(normalizedSearch)
      return matchSentiment && matchSearch
    })
  }, [tickets, searchId, sentimentFilter])

  const copyId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      addToast({
        title: 'ID copiado',
        description: 'Ya puedes usarlo en el formulario.',
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

  return (
    <div className="rounded-2xl border border-white/10 bg-white/95 p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tickets en tiempo real</h2>
          <p className="text-xs text-slate-500">Ultimos {MAX_ITEMS} tickets</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            placeholder="Buscar por ID"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          />
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
          >
            <option value="todos">Todos</option>
            <option value="negativo">Negativo</option>
            <option value="neutral">Neutral</option>
            <option value="positivo">Positivo</option>
          </select>
        </div>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-500">Cargando...</p>}
      {error && <p className="mt-4 text-sm text-rose-600">Error: {error}</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Sentimiento</th>
                <th className="px-3 py-2 text-left">Procesado</th>
                <th className="px-3 py-2 text-left">Creado</th>
                <th className="px-3 py-2 text-left">Actualizado</th>
                <th className="px-3 py-2 text-left">Accion</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => {
                const shortId = `${ticket.id.slice(0, 8)}...${ticket.id.slice(-4)}`
                const sentiment = ticket.sentiment || '-'
                return (
                  <tr key={ticket.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-mono text-xs text-slate-700">
                      {shortId}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{ticket.category ?? '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        sentiment === 'Negativo'
                          ? 'bg-rose-100 text-rose-700'
                          : sentiment === 'Positivo'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-700'
                      }`}>
                        {sentiment}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {ticket.processed ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          true
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          false
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {formatDate(ticket.created_at)}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">
                      {formatDate(ticket.updated_at)}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => copyId(ticket.id)}
                        className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copiar ID
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                    No hay tickets para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
