import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react'
import { useAuth } from '../lib/auth'

const ESTADOS = { IDLE: 'idle', AUTENTICANDO: 'autenticando' } as const

function horaBrasilia(): string {
  return (
    new Date().toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' BRT'
  )
}

function useRelogio(): string {
  const [hora, setHora] = useState(horaBrasilia)
  useEffect(() => {
    const id = setInterval(() => setHora(horaBrasilia()), 1000)
    return () => clearInterval(id)
  }, [])
  return hora
}

function useGalaxia() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let w = 0
    let h = 0
    const redimensionar = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    redimensionar()
    window.addEventListener('resize', redimensionar)
    const particulas: { x: number; y: number; vx: number; vy: number; vida: number; max: number; t: number; cor: string }[] = []
    const CORES = ['16, 160, 160', '107, 163, 215', '237, 241, 247']
    let mx = -999
    let my = -999
    let cx = -999
    let cy = -999
    function emitir(x: number, y: number) {
      if (particulas.length > 80) return
      const ang = Math.random() * Math.PI * 2
      const vel = 0.2 + Math.random() * 0.9
      particulas.push({
        x,
        y,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel - 0.15,
        vida: 0,
        max: 60 + Math.random() * 40,
        t: 0.6 + Math.random() * 1.6,
        cor: CORES[Math.floor(Math.random() * CORES.length)],
      })
    }
    const passo = () => {
      ctx.clearRect(0, 0, w, h)
      cx += (mx - cx) * 0.08
      cy += (my - cy) * 0.08
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 170)
      g.addColorStop(0, 'rgba(16, 160, 160, 0.06)')
      g.addColorStop(1, 'rgba(16, 160, 160, 0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i]
        p.vida++
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        if (p.vida > p.max || p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
          particulas.splice(i, 1)
          continue
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.t, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.cor}, ${0.7 * (1 - p.vida / p.max)})`
        ctx.fill()
      }
      raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    function aoMover(e: globalThis.MouseEvent) {
      mx = e.clientX
      my = e.clientY
      emitir(e.clientX, e.clientY)
    }
    window.addEventListener('mousemove', aoMover)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', redimensionar)
      window.removeEventListener('mousemove', aoMover)
    }
  }, [])
  return canvasRef
}

function Starfield() {
  const estrelas = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() < 0.7 ? 1 : 2,
        delay: Math.random() * 4,
        minO: 0.15 + Math.random() * 0.2,
        maxO: 0.55 + Math.random() * 0.35,
        driftX: (Math.random() - 0.5) * 28,
        driftY: (Math.random() - 0.5) * 28,
        driftDur: 9 + Math.random() * 10,
        driftDelay: Math.random() * 6,
      })),
    []
  )
  return (
    <div className="starfield">
      {estrelas.map((s) => (
        <span
          key={s.id}
          className="star"
          style={{
            top: s.top + '%',
            left: s.left + '%',
            width: s.size,
            height: s.size,
            animationDelay: s.delay + 's',
            '--min-o': s.minO,
            '--max-o': s.maxO,
            '--drift-x': s.driftX + 'px',
            '--drift-y': s.driftY + 'px',
            '--drift-dur': s.driftDur + 's',
            '--drift-delay': s.driftDelay + 's',
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const { login } = useAuth()
  const [idOperador, setIdOperador] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<{ idOperador?: string; senha?: string }>({})
  const [estado, setEstado] = useState<(typeof ESTADOS)[keyof typeof ESTADOS]>(ESTADOS.IDLE)
  const idRef = useRef<HTMLInputElement>(null)
  const senhaRef = useRef<HTMLInputElement>(null)
  const lockupRef = useRef<HTMLDivElement>(null)
  const alvoRef = useRef({ x: 0, y: 0 })
  const atualRef = useRef({ x: 0, y: 0 })
  const hora = useRelogio()
  const galaxiaRef = useGalaxia()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const passo = () => {
      const el = lockupRef.current
      if (el) {
        const k = 0.12
        atualRef.current.x += (alvoRef.current.x - atualRef.current.x) * k
        atualRef.current.y += (alvoRef.current.y - atualRef.current.y) * k
        const { x, y } = atualRef.current
        el.style.transform =
          Math.abs(x) > 0.01 || Math.abs(y) > 0.01 ? `rotateX(${y}deg) rotateY(${x}deg)` : ''
      }
      raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [])

  function aoMover(e: MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    alvoRef.current = { x: px * 10, y: py * -10 }
  }

  function aoSair() {
    alvoRef.current = { x: 0, y: 0 }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (estado === ESTADOS.AUTENTICANDO) return
    const novosErros: { idOperador?: string; senha?: string } = {}
    if (!idOperador.trim()) novosErros.idOperador = 'OBRIGATÓRIO — informe o ID do operador'
    if (!senha) novosErros.senha = 'OBRIGATÓRIO — informe a senha'
    if (novosErros.idOperador || novosErros.senha) {
      setErros(novosErros)
      if (novosErros.idOperador) idRef.current?.focus()
      else senhaRef.current?.focus()
      return
    }
    setErros({})
    setEstado(ESTADOS.AUTENTICANDO)
    try {
      await login(idOperador.trim(), senha)
    } catch {
      setEstado(ESTADOS.IDLE)
      setErros({ senha: 'ACESSO NEGADO — credenciais não reconhecidas' })
      senhaRef.current?.focus()
    }
  }

  return (
    <div className="login-app">
      <canvas ref={galaxiaRef} className="galaxy-canvas" aria-hidden="true" />
      <header className="login-header">
        <span className="login-header-mark">
          <img src="/icon-atalho.png" alt="" className="header-icon" />
          Rota Group // Custo Dashboard
        </span>
        <div className="login-header-status">
          <span className="status-chip">
            <span className="status-dot" />
            Sistema estável
          </span>
          <span className="clock">{hora}</span>
        </div>
      </header>

      <main className="login-layout">
        <section className="instrument-panel" onMouseMove={aoMover} onMouseLeave={aoSair} aria-hidden="true">
          <Starfield />
          <span className="corner-bracket tl" />
          <span className="corner-bracket tr" />
          <span className="corner-bracket bl" />
          <span className="corner-bracket br" />
          <div className="logo-lockup" ref={lockupRef}>
            <span className="logo-halo" />
            <img src="/icon-atalho.png" alt="Rota Group" className="logo-icon" />
            <span className="logo-tag">Custo Dashboard</span>
          </div>
          <p className="instrument-caption">Rota Group · aguardando credenciais</p>
        </section>

        <div className="login-side">
          <img src="/icon-atalho.png" alt="" aria-hidden="true" className="login-watermark" />
          <div className="login-card">
            <div className="brand">
              <img src="/icon-atalho.png" alt="" className="brand-mark" />
              <h1 className="brand-word">CUSTO DASHBOARD</h1>
            </div>
            <p className="tagline">Análise de custos · controle de acesso</p>
            <form onSubmit={enviar} noValidate>
              <div className={`field${erros.idOperador ? ' has-error' : ''}`}>
                <label className="field-label" htmlFor="idOperador">ID do operador</label>
                <div className="field-shell">
                  <input id="idOperador" ref={idRef} type="text" autoComplete="username" placeholder="usuario@rota.com.br"
                    value={idOperador} disabled={estado === ESTADOS.AUTENTICANDO}
                    aria-describedby={erros.idOperador ? 'erro-idOperador' : undefined}
                    onChange={(e) => setIdOperador(e.target.value)} />
                </div>
                {erros.idOperador && <p className="field-error" id="erro-idOperador" role="alert">{erros.idOperador}</p>}
              </div>
              <div className={`field${erros.senha ? ' has-error' : ''}`}>
                <label className="field-label" htmlFor="senha">Senha</label>
                <div className="field-shell">
                  <input id="senha" ref={senhaRef} type="password" autoComplete="current-password" placeholder="••••••••••"
                    value={senha} disabled={estado === ESTADOS.AUTENTICANDO}
                    aria-describedby={erros.senha ? 'erro-senha' : undefined}
                    onChange={(e) => setSenha(e.target.value)} />
                </div>
                {erros.senha && <p className="field-error" id="erro-senha" role="alert">{erros.senha}</p>}
              </div>
              <div className="row-between">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  Manter sessão ativa
                </label>
                <a href="#" className="text-link" onClick={(e) => e.preventDefault()}>Esqueceu a senha?</a>
              </div>
              <button type="submit" className="submit-btn" disabled={estado === ESTADOS.AUTENTICANDO}>
                <span className="scan" />
                {estado === ESTADOS.AUTENTICANDO ? (
                  <span className="loader"><span /><span /><span /></span>
                ) : (
                  'Autenticar'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
