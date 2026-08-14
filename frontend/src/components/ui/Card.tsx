import type { ReactNode } from 'react'

interface Props {
  titulo?: string
  acoes?: ReactNode
  children: ReactNode
  className?: string
}

export default function Card({ titulo, acoes, children, className = '' }: Props) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}
    >
      {(titulo || acoes) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          {titulo && (
            <div className="text-[13px] font-semibold" style={{ color: 'var(--cor-tinta)' }}>
              {titulo}
            </div>
          )}
          {acoes}
        </div>
      )}
      {children}
    </div>
  )
}
