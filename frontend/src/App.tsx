import { motion } from 'framer-motion'
import { TicketForm } from './components/TicketForm'
import { TicketsRealtime } from './components/TicketsRealtime'
import { ToastProvider } from './components/ui/Toast'

function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-950 text-slate-900">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,116,144,0.25),_transparent_55%)]" />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12">
            <motion.header
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                Demo en tiempo real
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
                AI-Powered Support Co-Pilot
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">
                Orquesta tickets con IA, Supabase y n8n en un flujo listo para demos: crea, procesa y monitorea resultados sin refrescar la pagina.
              </p>
            </motion.header>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <TicketForm />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-200"
              >
                <h2 className="text-lg font-semibold text-white">Guia rapida</h2>
                <ol className="mt-4 space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                    <span>
                      Crea un ticket si no tienes UUID. El sistema genera el ID automaticamente.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                    <span>Procesa el ticket via webhook n8n (Render puede tardar al despertar).</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                    <span>Observa el update en tiempo real sin refrescar.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                    <span>Los sentimientos negativos disparan un email simulado.</span>
                  </li>
                </ol>

                <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
                  <p className="font-semibold text-white">Tips de demo</p>
                  <ul className="mt-2 space-y-1">
                    <li>- Usa descripciones claras para ver categorias y sentimientos distintos.</li>
                    <li>- Render free puede tardar ~50s en la primera llamada.</li>
                    <li>- Puedes copiar IDs desde la tabla inferior.</li>
                  </ul>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="mt-10"
            >
              <TicketsRealtime />
            </motion.div>
          </div>
        </div>
      </div>
    </ToastProvider>
  )
}

export default App
