import type { ReactNode } from 'react'

interface Props {
  titulo: string
  children: ReactNode
  onFechar: () => void
}

export default function Modal({ titulo, children, onFechar }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 8, 16, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onFechar}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-5"
        style={{ background: 'var(--cor-superficie)', borderColor: 'var(--cor-borda)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[15px] font-semibold mb-4" style={{ color: 'var(--cor-tinta)' }}>
          {titulo}
        </div>
        {children}
      </div>
    </div>
  )
}
