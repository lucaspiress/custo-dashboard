function Bloco({ className }: { className: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />
}

export function ProjetosCarregando() {
  return (
    <div aria-busy="true" aria-label="Carregando projetos" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((indice) => (
        <div key={indice} className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
          <Bloco className="h-5 w-3/5 rounded" />
          <Bloco className="h-4 w-2/5 rounded" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((item) => <Bloco key={item} className="h-14 rounded-lg" />)}
          </div>
          <div className="flex gap-2 border-t pt-4" style={{ borderColor: 'var(--cor-borda)' }}>
            <Bloco className="h-8 w-24 rounded-lg" />
            <Bloco className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CabecalhoCarregando() {
  return (
    <header className="min-h-[64px] shrink-0 border-b flex items-center justify-between gap-4 px-4 sm:px-5 py-3" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <Bloco className="h-8 w-8 rounded-lg" />
        <Bloco className="h-8 w-28 rounded" />
        <Bloco className="h-5 w-40 max-w-[35vw] rounded" />
      </div>
      <div className="flex gap-2">
        <Bloco className="h-9 w-9 sm:w-28 rounded-lg" />
        <Bloco className="h-9 w-9 sm:w-28 rounded-lg" />
      </div>
    </header>
  )
}

export function DashboardCarregando() {
  return (
    <div aria-busy="true" aria-label="Carregando dashboard" className="min-h-screen flex flex-col" style={{ background: 'var(--cor-fundo)' }}>
      <CabecalhoCarregando />
      <div className="flex flex-1 flex-col md:flex-row gap-5 p-5">
        <aside className="w-full md:w-64 shrink-0 rounded-2xl border p-3 space-y-2" style={{ background: 'var(--cor-sidebar)', borderColor: 'var(--cor-borda)' }}>
          {[0, 1, 2, 3, 4].map((indice) => <Bloco key={indice} className="h-9 w-full rounded-lg" />)}
        </aside>
        <main className="flex-1 min-w-0 space-y-5">
          <Bloco className="h-5 w-52 rounded" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((indice) => <Bloco key={indice} className="h-28 rounded-2xl" />)}
          </div>
          <Bloco className="h-72 w-full rounded-2xl" />
        </main>
      </div>
    </div>
  )
}

export function PlanilhaCarregando() {
  return (
    <div aria-busy="true" aria-label="Carregando planilha" className="min-h-screen flex flex-col" style={{ background: 'var(--cor-fundo)' }}>
      <CabecalhoCarregando />
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2"><Bloco className="h-4 w-28 rounded" /><Bloco className="h-7 w-52 rounded" /><Bloco className="h-4 w-80 max-w-full rounded" /></div>
          <div className="flex gap-3"><Bloco className="h-10 w-20 rounded" /><Bloco className="h-10 w-20 rounded" /><Bloco className="h-10 w-20 rounded" /></div>
        </div>
        <div className="rounded-2xl border overflow-hidden p-4 space-y-3" style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)' }}>
          <Bloco className="h-9 w-full rounded" />
          {[0, 1, 2, 3, 4].map((indice) => <Bloco key={indice} className="h-11 w-full rounded" />)}
        </div>
      </main>
    </div>
  )
}
