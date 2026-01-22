import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

async function fetchTickets(): Promise<TicketRow[]> {
  const queries = [
    {
      select: 'id, description, category, sentiment, processed, updated_at, created_at',
      order: { column: 'updated_at', ascending: false },
    },
    {
      select: 'id, description, category, sentiment, processed, created_at',
      order: { column: 'created_at', ascending: false },
    },
    {
      select: 'id, description, category, sentiment, processed',
      order: null as null | { column: string; ascending: boolean },
    },
  ]

  for (const query of queries) {
    let builder = supabase.from('tickets').select(query.select).limit(MAX_ITEMS)
    if (query.order) {
      builder = builder.order(query.order.column, { ascending: query.order.ascending })
    }
    const { data, error } = await builder
    if (!error && data) {
      return data as TicketRow[]
    }
  }

  return []
}

export function TicketsRealtime() {
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const columns = useMemo(
    () => [
      { key: 'id', label: 'ID' },
      { key: 'category', label: 'Categoria' },
      { key: 'sentiment', label: 'Sentiment' },
      { key: 'processed', label: 'Processed' },
      { key: 'updated_at', label: 'Updated' },
      { key: 'created_at', label: 'Created' },
    ],
    [],
  )

  useEffect(() => {
    let isMounted = true

    async function load() {
      setLoading(true)
      setError('')
      const data = await fetchTickets()
      if (isMounted) {
        setTickets(data)
        setLoading(false)
      }
    }

    load()

    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          const row = (payload.new || payload.old) as TicketRow
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
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Tickets en tiempo real
        </h2>
        <span className="text-xs text-slate-500">
          Ultimos {MAX_ITEMS}
        </span>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando...</p>}
      {error && (
        <p className="text-sm text-rose-600">Error: {error}</p>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-3 py-2 text-left">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-700">
                    {ticket.id}
                  </td>
                  <td className="px-3 py-2">{ticket.category ?? '-'}</td>
                  <td className="px-3 py-2">
                    {ticket.sentiment ?? '-'}
                  </td>
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {ticket.updated_at ?? '-'}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {ticket.created_at ?? '-'}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-3 py-6 text-center text-sm text-slate-500"
                  >
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
