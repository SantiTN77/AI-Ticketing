import { TicketForm } from './components/TicketForm'
import { TicketsRealtime } from './components/TicketsRealtime'

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900">
            AI-Powered Support Co-Pilot
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Procesa tickets con IA via n8n y sincroniza cambios en tiempo real.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <TicketForm />
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
            <h3 className="text-base font-semibold text-slate-800 mb-2">
              Flujo
            </h3>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Crear ticket en Supabase.</li>
              <li>Enviar UUID + description al webhook n8n.</li>
              <li>El backend clasifica y actualiza el ticket.</li>
              <li>Realtime actualiza la lista automaticamente.</li>
            </ol>
          </div>
        </div>

        <div className="mt-8">
          <TicketsRealtime />
        </div>
      </div>
    </div>
  )
}

export default App
