import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(value?: string | null): string {
  if (!value) return '-'
  try {
    const date = parseISO(value)
    return format(date, "d LLL yyyy, h:mm a", { locale: es })
  } catch {
    return value
  }
}
