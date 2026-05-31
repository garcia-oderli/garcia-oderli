'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Maximize2, Pause, Play, Settings } from 'lucide-react'
import Link from 'next/link'

interface HoraLinha {
  hora: string
  inicio: Date
  fim: Date
  meta_h: number
  realizado: number
  acumulado: number
  status: 'OK' | 'ATEN' | 'ABX' | 'FUTURO'
}

interface MetaSetor {
  meta_dia: number
  turno_inicio: string
  turno_fim: string
  intervalo_inicio: string | null
  intervalo_fim: string | null
  unidade: string
}

interface MaquinaCard {
  id: string
  codigo: string
  nome: string
  produzido: number
  operador: string | null
  ultima: string | null
  status: 'OK' | 'ATEN' | 'ABX' | 'PARADA'
}

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtHora(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
function fmtNum(n: number) { return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }
function fmtPct(n: number) { return n.toFixed(1) + '%' }

function hojeStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function statusColor(s: 'OK' | 'ATEN' | 'ABX' | 'FUTURO' | 'PARADA') {
  if (s === 'OK') return '#4CAF50'
  if (s === 'ATEN') return '#F5A623'
  if (s === 'ABX') return '#F44336'
  if (s === 'PARADA') return '#444'
  return '#333'
}

function statusLabel(s: HoraLinha['status']) {
  if (s === 'OK') return '✓ OK'
  if (s === 'ATEN') return '! ATEN'
  if (s === 'ABX') return '✕ ABX'
  return ''
}

function eficienciaColor(e: number) {
  if (e >= 95) return '#4CAF50'
  if (e >= 75) return '#F5A623'
  return '#F44336'
}

function nextClockHour(d: Date): Date {
  const n = new Date(d)
  if (n.getMinutes() === 0 && n.getSeconds() === 0) {
    n.setHours(n.getHours() + 1)
  } else {
    n.setMinutes(0, 0, 0)
    n.setHours(n.getHours() + 1)
  }
  return n
}

function buildHoras(turnoInicio: string, turnoFim: string, hoje: string, intervaloInicio?: string | null, intervaloFim?: string | null): { inicio: Date; fim: Date }[] {
  const parse = (t: string) => { const [h, m] = t.split(':').map(Number); return new Date(`${hoje}T${pad(h)}:${pad(m)}:00`) }
  const intStart = intervaloInicio ? parse(intervaloInicio) : null
  const intEnd = intervaloFim ? parse(intervaloFim) : null
  const buckets: { inicio: Date; fim: Date }[] = []
  let cur = parse(turnoInicio)
  const end = parse(turnoFim)
  while (cur < end) {
    if (intStart && intEnd && cur >= intStart && cur < intEnd) { cur = new Date(intEnd); continue }
    let next = nextClockHour(cur)
    if (intStart && intEnd && cur < intStart && next > intStart) next = new Date(intStart)
    if (next > end) next = new Date(end)
    buckets.push({ inicio: new Date(cur), fim: new Date(next) })
    cur = next
  }
  return buckets
}

function formatRelative(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min atrás`
  return `${Math.floor(m / 60)}h atrás`
}

type Aba = 'geral' | 'maquinas'

export default function SetorTVPage() {
  const params = useParams()
  const setor = decodeURIComponent(params.setor as string)

  const [aba, setAba] = useState<Aba>('geral')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const [meta, setMeta] = useState<MetaSetor | null>(null)
  const [linhas, setLinhas] = useState<HoraLinha[]>([])
  const [maquinas, setMaquinas] = useState<MaquinaCard[]>([])
  const [agora, setAgora] = useState(new Date())
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metaEditOpen, setMetaEditOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tbodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const hoje = hojeStr()

    const [metaRes, apRes, maqRes] = await Promise.all([
      (supabase as any).from('metas_setor')
        .select('meta_dia, turno_inicio, turno_fim, intervalo_inicio, intervalo_fim, unidade')
        .ilike('setor', setor).eq('data', hoje).maybeSingle(),
      (supabase as any).from('apontamentos')
        .select('quantidade_produzida, created_at, maquina_id, maquinas(setor, codigo, descricao), funcionarios(setor, nome)')
        .gte('created_at', `${hoje}T00:00:00`)
        .lte('created_at', `${hoje}T23:59:59`),
      (supabase as any).from('maquinas')
        .select('id, codigo, descricao, setor')
        .ilike('setor', setor)
        .order('codigo'),
    ])

    const metaData: MetaSetor = metaRes.data ?? {
      meta_dia: 0, turno_inicio: '07:00', turno_fim: '16:55',
      intervalo_inicio: '11:00', intervalo_fim: '12:12', unidade: 'pç',
    }
    setMeta(metaData)

    const setorLower = setor.toLowerCase()
    const todosAp: any[] = (apRes.data ?? []).filter((a: any) =>
      a.maquinas?.setor?.toLowerCase() === setorLower || a.funcionarios?.setor?.toLowerCase() === setorLower
    )

    // --- Hora a hora (geral) ---
    const buckets = buildHoras(metaData.turno_inicio, metaData.turno_fim, hoje, metaData.intervalo_inicio, metaData.intervalo_fim)
    const totalMinutos = buckets.reduce((s, b) => s + (b.fim.getTime() - b.inicio.getTime()) / 60000, 0)
    let acum = 0
    const now = new Date()
    const rows: HoraLinha[] = buckets.map(b => {
      const minutos = (b.fim.getTime() - b.inicio.getTime()) / 60000
      const metaH = totalMinutos > 0 ? (metaData.meta_dia * minutos) / totalMinutos : 0
      const realizado = todosAp
        .filter(a => { const t = new Date(a.created_at); return t >= b.inicio && t < b.fim })
        .reduce((s: number, a: any) => s + (a.quantidade_produzida ?? 0), 0)
      acum += realizado
      let status: HoraLinha['status'] = 'FUTURO'
      if (now >= b.fim) {
        status = realizado >= metaH ? 'OK' : realizado >= metaH * 0.7 ? 'ATEN' : 'ABX'
      } else if (now >= b.inicio) {
        const frac = (now.getTime() - b.inicio.getTime()) / (b.fim.getTime() - b.inicio.getTime())
        if (frac > 0.5) {
          const metaParcial = metaH * frac
          status = realizado >= metaParcial ? 'OK' : realizado >= metaParcial * 0.7 ? 'ATEN' : 'ABX'
        }
      }
      return { hora: `${fmtHora(b.inicio)}–${fmtHora(b.fim)}`, inicio: b.inicio, fim: b.fim, meta_h: Math.round(metaH), realizado, acumulado: acum, status }
    })
    setLinhas(rows)

    // --- Cards por máquina ---
    const todasMaq: any[] = maqRes.data ?? []
    const cards: MaquinaCard[] = todasMaq.map(m => {
      const aps = todosAp.filter(a => a.maquina_id === m.id)
      const produzido = aps.reduce((s: number, a: any) => s + (a.quantidade_produzida ?? 0), 0)
      const ultima = aps.length > 0 ? aps.reduce((max: string, a: any) => a.created_at > max ? a.created_at : max, aps[0].created_at) : null
      const operador = aps.length > 0 ? (aps[aps.length - 1].funcionarios?.nome ?? null) : null
      const metaPorMaq = metaData.meta_dia > 0 && todasMaq.length > 0 ? metaData.meta_dia / todasMaq.length : 0
      let status: MaquinaCard['status'] = 'PARADA'
      if (produzido > 0) {
        const pct = metaPorMaq > 0 ? (produzido / metaPorMaq) * 100 : 100
        status = pct >= 95 ? 'OK' : pct >= 70 ? 'ATEN' : 'ABX'
      }
      return { id: m.id, codigo: m.codigo, nome: m.descricao ?? '', produzido, operador, ultima, status }
    })
    setMaquinas(cards)
    setLoading(false)
  }, [setor])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (paused) { if (timerRef.current) clearInterval(timerRef.current); return }
    timerRef.current = setInterval(fetchData, 60000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused, fetchData])

  useEffect(() => {
    if (!tbodyRef.current) return
    const active = tbodyRef.current.querySelector('[data-active="true"]') as HTMLElement
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [linhas])

  const totalProduzido = linhas.reduce((s, l) => s + l.realizado, 0)
  const metaDia = meta?.meta_dia ?? 0
  const unidade = meta?.unidade ?? 'pç'
  const eficiencia = metaDia > 0 ? (totalProduzido / metaDia) * 100 : 0
  const efColor = eficienciaColor(eficiencia)
  const now = agora
  const turnoInicio = meta ? new Date(`${hojeStr()}T${meta.turno_inicio}:00`) : null
  const turnoFim = meta ? new Date(`${hojeStr()}T${meta.turno_fim}:00`) : null
  const minDecorridos = turnoInicio ? Math.max(0, (now.getTime() - turnoInicio.getTime()) / 60000) : 0
  const minRestantes = turnoFim ? Math.max(0, (turnoFim.getTime() - now.getTime()) / 60000) : 0
  const ritmoAtual = minDecorridos > 0 ? (totalProduzido / minDecorridos) * 60 : 0
  const ritmoNecessario = minRestantes > 0 ? ((metaDia - totalProduzido) / minRestantes) * 60 : 0
  const projecao = turnoFim && turnoInicio ? ritmoAtual * ((turnoFim.getTime() - turnoInicio.getTime()) / 3600000) : totalProduzido
  const progresso = metaDia > 0 ? Math.min((totalProduzido / metaDia) * 100, 100) : 0

  if (loading) return <div style={{ color: '#888', padding: '60px', textAlign: 'center', background: '#111', height: '100vh' }}>Carregando...</div>

  return (
    <div style={{ background: '#111', height: '100vh', color: '#F5F5F5', fontFamily: 'Barlow Condensed, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', background: '#1C1C1C', borderBottom: '1px solid #2A2A2A', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/setor" style={{ color: '#555', textDecoration: 'none', fontSize: '12px', letterSpacing: '0.06em' }}>
            ← SETORES
          </Link>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F5F5F5' }}>
            {setor}
          </h1>
          {/* Abas */}
          <div style={{ display: 'flex', background: '#111', border: '1px solid #2A2A2A', borderRadius: '4px', overflow: 'hidden' }}>
            {(['geral', 'maquinas'] as Aba[]).map(a => (
              <button key={a} onClick={() => setAba(a)}
                style={{ padding: '5px 16px', fontSize: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: aba === a ? '#F5A623' : 'transparent', color: aba === a ? '#111' : '#666' }}>
                {a === 'geral' ? 'GERAL' : `MÁQUINAS (${maquinas.length})`}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setMetaEditOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: '4px', color: '#666', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.05em' }}>
            <Settings size={11} /> META
          </button>
          <button onClick={() => setPaused(p => !p)}
            style={{ background: 'transparent', border: '1px solid #2A2A2A', borderRadius: '4px', color: paused ? '#F5A623' : '#666', padding: '5px 8px', cursor: 'pointer' }}>
            {paused ? <Play size={11} /> : <Pause size={11} />}
          </button>
          <button onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {})
              } else {
                document.exitFullscreen().catch(() => {})
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: isFullscreen ? '#2A3A2A' : 'transparent', border: `1px solid ${isFullscreen ? '#4CAF50' : '#2A2A2A'}`, borderRadius: '4px', color: isFullscreen ? '#4CAF50' : '#888', padding: '5px 10px', cursor: 'pointer', fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.06em' }}>
            <Maximize2 size={11} /> {isFullscreen ? 'SAIR' : 'TELA CHEIA'}
          </button>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#F5A623', letterSpacing: '0.05em', minWidth: '95px', textAlign: 'right' }}>
            {pad(agora.getHours())}:{pad(agora.getMinutes())}:{pad(agora.getSeconds())}
          </div>
        </div>
      </div>

      {/* Content */}
      {aba === 'geral' ? (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '70% 30%', overflow: 'hidden' }}>
          {/* Tabela hora a hora */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #2A2A2A' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 1fr 1fr 1fr', padding: '10px 28px', background: '#181818', borderBottom: '1px solid #222', flexShrink: 0 }}>
              {['HORA', `META/${unidade.toUpperCase()}`, 'REALIZADO', 'ACUM.', 'STATUS'].map(h => (
                <div key={h} style={{ fontSize: '12px', color: '#444', letterSpacing: '0.12em', fontWeight: 700 }}>{h}</div>
              ))}
            </div>
            {/* Rows — stretch to fill height evenly */}
            <div ref={tbodyRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {linhas.map((l, i) => {
                const isAtivo = now >= l.inicio && now < l.fim
                const isPast = now >= l.fim
                return (
                  <div key={i} data-active={isAtivo ? 'true' : 'false'}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 0.7fr 1fr 1fr 1fr', padding: '0 28px', flex: 1, alignItems: 'center', background: isAtivo ? '#1A2A1A' : 'transparent', borderBottom: '1px solid #1A1A1A', borderLeft: isAtivo ? '4px solid #4CAF50' : '4px solid transparent', minHeight: '52px' }}>
                    <div style={{ fontSize: '20px', color: isAtivo ? '#F5F5F5' : isPast ? '#999' : '#3A3A3A', fontWeight: isAtivo ? 700 : 500, letterSpacing: '0.04em' }}>{l.hora}</div>
                    <div style={{ fontSize: '20px', color: '#555', fontWeight: 500 }}>{l.meta_h > 0 ? fmtNum(l.meta_h) : '—'}</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: isPast || isAtivo ? statusColor(l.status) : '#2A2A2A' }}>
                      {l.realizado > 0 ? fmtNum(l.realizado) : isPast ? '0' : '—'}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: isPast || isAtivo ? (l.status === 'ABX' ? '#F44336' : '#F5F5F5') : '#2A2A2A' }}>
                      {l.acumulado > 0 ? fmtNum(l.acumulado) : '—'}
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: statusColor(l.status), letterSpacing: '0.06em' }}>
                      {l.status !== 'FUTURO' ? statusLabel(l.status) : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', overflowY: 'auto' }}>
            <KpiBox label="Meta do Dia">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '48px', fontWeight: 700, color: '#F5A623', lineHeight: 1 }}>{metaDia > 0 ? fmtNum(metaDia) : '—'}</span>
                <span style={{ fontSize: '16px', color: '#666', textTransform: 'uppercase' }}>{unidade}</span>
              </div>
            </KpiBox>
            <KpiBox label="Produção Acumulada">
              <div style={{ fontSize: '88px', fontWeight: 700, color: efColor, lineHeight: 1 }}>{fmtNum(totalProduzido)}</div>
            </KpiBox>
            <KpiBox label="Eficiência" right={metaDia > 0 ? <Tag color={efColor}>{eficiencia >= 95 ? '● NO PLANO' : eficiencia >= 75 ? '! ATENÇÃO' : '● ABAIXO'}</Tag> : undefined}>
              <div style={{ fontSize: '64px', fontWeight: 700, color: efColor, lineHeight: 1 }}>{metaDia > 0 ? fmtPct(eficiencia) : '—'}</div>
            </KpiBox>
            <KpiBox label="Progresso do Dia" right={<span style={{ fontSize: '14px', color: efColor, fontWeight: 700 }}>{fmtPct(progresso)}</span>}>
              <div style={{ height: '10px', background: '#2A2A2A', borderRadius: '5px', overflow: 'hidden', margin: '8px 0 6px' }}>
                <div style={{ height: '100%', width: `${progresso}%`, background: efColor, borderRadius: '5px', transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#333' }}>0</span>
                <span style={{ fontSize: '11px', color: '#444' }}>Meta: {fmtNum(metaDia)}</span>
              </div>
            </KpiBox>
            <KpiBox label="">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Ritmo Atual', value: ritmoAtual > 0 ? fmtNum(Math.round(ritmoAtual)) : '—', sub: `${unidade}/hora`, color: efColor },
                  { label: 'Necessário', value: ritmoNecessario > 0 && minRestantes > 0 ? fmtNum(Math.round(ritmoNecessario)) : '—', sub: `${unidade}/hora`, color: '#666' },
                  { label: 'Projeção', value: projecao > 0 ? fmtNum(Math.round(projecao)) : '—', sub: `${unidade} final`, color: projecao >= metaDia ? '#4CAF50' : '#F44336' },
                ].map(k => (
                  <div key={k.label}>
                    <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>{k.label}</div>
                    <div style={{ fontSize: '36px', fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
                    <div style={{ fontSize: '10px', color: '#333', marginTop: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            </KpiBox>
          </div>
        </div>
      ) : (
        /* Aba MÁQUINAS */
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {maquinas.length === 0 ? (
            <div style={{ color: '#555', textAlign: 'center', padding: '60px', fontSize: '14px' }}>
              Nenhuma máquina cadastrada para o setor "{setor}".<br />
              <span style={{ fontSize: '12px', color: '#444' }}>Cadastre em Cadastros → Máquinas e defina o setor.</span>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {maquinas.map(m => (
                <MaquinaCardUI key={m.id} m={m} unidade={unidade} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '5px 20px', background: '#1C1C1C', borderTop: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: '10px', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' }}>FLUXO · DEFINE · RESULTADO</span>
        <span style={{ fontSize: '10px', color: '#333', letterSpacing: '0.08em' }}>▌ RITMOPROD</span>
      </div>

      {metaEditOpen && (
        <MetaModal setor={setor} onClose={() => setMetaEditOpen(false)} onSaved={() => { setMetaEditOpen(false); fetchData() }} />
      )}
    </div>
  )
}

function KpiBox({ label, children, right }: { label: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ background: '#1C1C1C', border: '1px solid #222', borderRadius: '8px', padding: '12px 16px' }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', padding: '2px 7px', borderRadius: '4px', background: color + '22', color }}>
      {children}
    </span>
  )
}

function MaquinaCardUI({ m, unidade }: { m: MaquinaCard; unidade: string }) {
  const sc = statusColor(m.status)
  const isAtivo = m.ultima !== null && (Date.now() - new Date(m.ultima).getTime()) < 3600000 * 2
  return (
    <div style={{ background: '#1C1C1C', border: `1px solid ${isAtivo ? '#3A3A3A' : '#222'}`, borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', overflow: 'hidden' }}>
      {/* Status strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: sc }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#F5F5F5', letterSpacing: '0.06em' }}>{m.codigo}</div>
          <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{m.nome}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {isAtivo && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4CAF50', display: 'inline-block', boxShadow: '0 0 6px #4CAF5099' }} />}
          <span style={{ fontSize: '11px', fontWeight: 700, color: sc, letterSpacing: '0.04em' }}>
            {m.status === 'PARADA' ? 'PARADA' : m.status}
          </span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '10px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Produzido hoje</div>
        <div style={{ fontSize: '32px', fontWeight: 700, color: m.produzido > 0 ? sc : '#333', lineHeight: 1 }}>
          {fmtNum(m.produzido)}
          <span style={{ fontSize: '12px', color: '#444', marginLeft: '4px', fontWeight: 400 }}>{unidade}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #1E1E1E', paddingTop: '8px' }}>
        <div style={{ fontSize: '11px', color: '#555' }}>
          {m.operador ? <span style={{ color: '#888' }}>👤 {m.operador.split(' ')[0]}</span> : <span style={{ color: '#333' }}>Sem operador</span>}
        </div>
        <div style={{ fontSize: '10px', color: '#333', marginTop: '2px' }}>
          {m.ultima ? formatRelative(m.ultima) : 'Sem atividade hoje'}
        </div>
      </div>
    </div>
  )
}

function MetaModal({ setor, onClose, onSaved }: { setor: string; onClose: () => void; onSaved: () => void }) {
  const [metaDia, setMetaDia] = useState('')
  const [turnoInicio, setTurnoInicio] = useState('07:00')
  const [turnoFim, setTurnoFim] = useState('16:55')
  const [intervaloInicio, setIntervaloInicio] = useState('11:00')
  const [intervaloFim, setIntervaloFim] = useState('12:12')
  const [unidade, setUnidade] = useState('pç')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    ;(supabase as any).from('metas_setor').select('*').eq('setor', setor).eq('data', hojeStr()).maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setMetaDia(String(data.meta_dia))
          setTurnoInicio(data.turno_inicio.slice(0, 5))
          setTurnoFim(data.turno_fim.slice(0, 5))
          setIntervaloInicio(data.intervalo_inicio ? data.intervalo_inicio.slice(0, 5) : '11:00')
          setIntervaloFim(data.intervalo_fim ? data.intervalo_fim.slice(0, 5) : '12:12')
          setUnidade(data.unidade)
        }
      })
  }, [setor])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    await (supabase as any).from('metas_setor').upsert({
      setor, data: hojeStr(),
      meta_dia: parseFloat(metaDia) || 0,
      turno_inicio: turnoInicio, turno_fim: turnoFim,
      intervalo_inicio: intervaloInicio || null, intervalo_fim: intervaloFim || null,
      unidade,
    }, { onConflict: 'setor,data' })
    setSaving(false)
    onSaved()
  }

  const inp: React.CSSProperties = { background: '#111', border: '1px solid #2A2A2A', color: '#F5F5F5', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '28px', width: '360px', maxWidth: '90vw' }}>
        <h2 style={{ margin: '0 0 20px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5A623' }}>
          Meta — {setor}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Meta do Dia</label>
            <input type="number" value={metaDia} onChange={e => setMetaDia(e.target.value)} placeholder="ex: 1500" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Unidade</label>
            <input type="text" value={unidade} onChange={e => setUnidade(e.target.value)} placeholder="pç, cx, m²..." style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Início Turno</label>
              <input type="time" value={turnoInicio} onChange={e => setTurnoInicio(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Fim Turno</label>
              <input type="time" value={turnoFim} onChange={e => setTurnoFim(e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '12px' }}>
            <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>Intervalo (almoço)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Início</label>
                <input type="time" value={intervaloInicio} onChange={e => setIntervaloInicio(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Fim</label>
                <input type="time" value={intervaloFim} onChange={e => setIntervaloFim(e.target.value)} style={inp} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#2A2A2A', border: 'none', borderRadius: '6px', color: '#888', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', background: '#F5A623', border: 'none', borderRadius: '6px', color: '#111', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar Meta'}
          </button>
        </div>
      </div>
    </div>
  )
}
