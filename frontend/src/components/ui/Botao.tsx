import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo'

const VARIANTS: Record<Variante, React.CSSProperties> = {
  primario: { background: 'linear-gradient(135deg, #2e59f6 0%, #3061d9 100%)', color: '#ffffff' },
  secundario: { background: 'var(--cor-elevado)', color: 'var(--cor-tinta)', border: '1px solid var(--cor-borda)' },
  fantasma: { background: 'transparent', color: 'var(--cor-mutado)' },
  perigo: { background: 'linear-gradient(135deg, #dc2626 0%, #b42323 100%)', color: '#ffffff' },
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  children: ReactNode
}

export default function Botao({ variante = 'primario', children, className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      className={`h-9 rounded-lg px-4 text-[13px] font-semibold inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 hover:opacity-90 ${className}`}
      style={VARIANTS[variante]}
    >
      {children}
    </button>
  )
}
