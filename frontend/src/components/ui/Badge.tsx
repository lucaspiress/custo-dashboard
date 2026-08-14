interface Props {
  cor: string
  rotulo: string
}

export default function Badge({ cor, rotulo }: Props) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ background: `${cor}1a`, color: cor, border: `1px solid ${cor}40` }}
    >
      {rotulo}
    </span>
  )
}
