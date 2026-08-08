import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from 'react'
import { useAuth } from '../lib/auth'

const ESTADOS = { IDLE: 'idle', AUTENTICANDO: 'autenticando' } as const

function horaUtc(): string {
  return new Date().toISOString().slice(11, 19) + ' UTC'
}

function useRelogio(): string {
  const [hora, setHora] = useState(horaUtc)
  useEffect(() => {
    const id = setInterval(() => setHora(horaUtc()), 1000)
    return () => clearInterval(id)
  }, [])
  return hora
}

function useTelemetria() {
  const [lat, setLat] = useState(-29.6842)
  const [lon, setLon] = useState(-53.8069)
  const [hdg, setHdg] = useState(214)
  useEffect(() => {
    const id = setInterval(() => {
      setLat((v) => v + (Math.random() - 0.5) * 0.0006)
      setLon((v) => v + (Math.random() - 0.5) * 0.0006)
      setHdg((v) => (v + (Math.random() - 0.5) * 1.4 + 360) % 360)
    }, 1400)
    return () => clearInterval(id)
  }, [])
  return { lat, lon, hdg }
}

function Starfield() {
  const estrelas = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() < 0.85 ? 1 : 2,
        delay: Math.random() * 4,
        minO: 0.08 + Math.random() * 0.15,
        maxO: 0.4 + Math.random() * 0.5,
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
  const { lat, lon, hdg } = useTelemetria()

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
            <img src="/logo-prince.png" alt="Rota Group" className="logo-word" />
            <span className="logo-tag">Custo Dashboard</span>
          </div>
          <div className="telemetry tl">
            <div><span className="lead">LAT</span> {lat.toFixed(4)}</div>
            <div><span className="lead">LON</span> {lon.toFixed(4)}</div>
          </div>
          <div className="telemetry br">
            <div><span className="lead">HDG</span> {hdg.toFixed(1)}°</div>
            <div><span className="lead">ALT</span> 11.280 M</div>
          </div>
          <p className="instrument-caption">Rota Group · aguardando credenciais</p>
        </section>

        <div className="login-side">
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
