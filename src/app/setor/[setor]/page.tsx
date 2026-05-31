'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Maximize2, Pause, Play, Settings, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface HoraLinha {
  hora: string   // "05:00–06:00"
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

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtHora(d: Date) { return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
function fmtNum(n: number) { return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) }
function fmtPct(n: number) { return n.toFixed(1) + '%' }

function hojeStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function statusColor(s: HoraLinha['status']) {
  if (s === 'OK') return '#4CAF50'
  if (s === 'ATEN') return '#F5A623'
  if (s === 'ABX') return '#F44336'
  return '#444'
}

function statusLabel(s: HoraLinha['status']) {
  if (s === 'OK') return '✓ OK'
  if (s === 'ATEN') return '! ATEN'
  if (s === 'ABX') return '✕ ABX'
  return '—'
}

function eficienciaColor(e: number) {
  if (e >= 95) return '#4CAF50'
  if (e >= 75) return '#F5A623'
  return '#F44336'
}

/** Next clock-aligned full hour (e.g. 12:12 → 13:00) */
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

/** Splits shift into clock-aligned buckets, skipping the lunch interval */
function buildHoras(turnoInicio: string, turnoFim: string, hoje: string, intervaloInicio?: string | null, intervaloFim?: string | null): { inicio: Date; fim: Date }[] {
  const parse = (t: string) => { const [h, m] = t.split(':').map(Number); return new Date(`${hoje}T${pad(h)}:${pad(m)}:00`) }
  const intStart = intervaloInicio ? parse(intervaloInicio) : null
  const intEnd = intervaloFim ? parse(intervaloFim) : null
  const buckets: { inicio: Date; fim: Date }[] = []
  let cur = parse(turnoInicio)
  const end = parse(turnoFim)
  while (cur < end) {
    // Skip over lunch interval
    if (intStart && intEnd && cur >= intStart && cur < intEnd) {
      cur = new Date(intEnd)
      continue
    }
    // Next boundary: clock-aligned hour, interval start, or turno end
    let next = nextClockHour(cur)
    if (intStart && intEnd && cur < intStart && next > intStart) next = new Date(intStart)
    if (next > end) next = new Date(end)
    buckets.push({ inicio: new Date(cur), fim: new Date(next) })
    cur = next
  }
  return buckets
}

export default function SetorTVPage() {
  const params = useParams()
  const setor = decodeURIComponent(params.setor as string)

  const [meta, setMeta] = useState<MetaSetor | null>(null)
  const [linhas, setLinhas] = useState<HoraLinha[]>([])
  const [agora, setAgora] = useState(new Date())
  const [paused, setPaused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [metaEditOpen, setMetaEditOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const hoje = hojeStr()

    const [metaRes, apRes] = await Promise.all([
      (supabase as any).from('metas_setor').select('meta_dia, turno_inicio, turno_fim, unidade').eq('setor', setor).eq('data', hoje).maybeSingle(),
      (supabase as any)
        .from('apontamentos')
        .select('quantidade_produzida, created_at, maquinas(setor), funcionarios(setor)')
        .gte('created_at', `${hoje}T00:00:00`)
        .lte('created_at', `${hoje}T23:59:59`),
    ])

    const metaData: MetaSetor = metaRes.data ?? {
      meta_dia: 0,
      turno_inicio: '07:00',
      turno_fim: '16:55',
      intervalo_inicio: '11:00',
      intervalo_fim: '12:12',
      unidade: 'pç',
    }
    setMeta(metaData)

    const apontamentos: any[] = (apRes.data ?? []).filter((a: any) =>
      a.maquinas?.setor === setor || a.funcionarios?.setor === setor
    )

    const buckets = buildHoras(metaData.turno_inicio, metaData.turno_fim, hoje, metaData.intervalo_inicio, metaData.intervalo_fim)
    const totalMinutos = buckets.reduce((s, b) => s + (b.fim.getTime() - b.inicio.getTime()) / 60000, 0)

    let acum = 0
    const rows: HoraLinha[] = buckets.map(b => {
      const minutos = (b.fim.getTime() - b.inicio.getTime()) / 60000
      const metaH = totalMinutos > 0 ? (metaData.meta_dia * minutos) / totalMinutos : 0
      const realizado = apontamentos
        .filter(a => {
          const t = new Date(a.created_at)
          return t >= b.inicio && t < b.fim
        })
        .reduce((s: number, a: any) => s + (a.quantidade_produzida ?? 0), 0)
      acum += realizado

      const now = new Date()
      let status: HoraLinha['status'] = 'FUTURO'
      if (now >= b.fim) {
        // Hora já terminou
        status = realizado >= metaH ? 'OK' : realizado >= metaH * 0.7 ? 'ATEN' : 'ABX'
      } else if (now >= b.inicio) {
        // Hora em andamento
        const fracDecorrida = (now.getTime() - b.inicio.getTime()) / (b.fim.getTime() - b.inicio.getTime())
        const metaParcial = metaH * fracDecorrida
        if (fracDecorrida > 0.5) {
          status = realizado >= metaParcial ? 'OK' : realizado >= metaParcial * 0.7 ? 'ATEN' : 'ABX'
        } else {
          status = 'FUTURO'
        }
      }

      return {
        hora: `${fmtHora(b.inicio)}–${fmtHora(b.fim)}`,
        inicio: b.inicio,
        fim: b.fim,
        meta_h: Math.round(metaH),
        realizado,
        acumulado: acum,
        status,
      }
    })

    setLinhas(rows)
    setLoading(false)
  }, [setor])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh
  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(fetchData, 60000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [paused, fetchData])

  // Derived KPIs
  const totalProduzido = linhas.reduce((s, l) => s + l.realizado, 0)
  const metaDia = meta?.meta_dia ?? 0
  const unidade = meta?.unidade ?? 'pç'
  const eficiencia = metaDia > 0 ? (totalProduzido / metaDia) * 100 : 0

  // Rhythm
  const now = agora
  const turnoInicio = meta ? new Date(`${hojeStr()}T${meta.turno_inicio}:00`) : null
  const turnoFim = meta ? new Date(`${hojeStr()}T${meta.turno_fim}:00`) : null
  const minDecorridos = turnoInicio ? Math.max(0, (now.getTime() - turnoInicio.getTime()) / 60000) : 0
  const minRestantes = turnoFim ? Math.max(0, (turnoFim.getTime() - now.getTime()) / 60000) : 0
  const ritmoAtual = minDecorridos > 0 ? (totalProduzido / minDecorridos) * 60 : 0
  const ritmoNecessario = minRestantes > 0 ? ((metaDia - totalProduzido) / minRestantes) * 60 : 0
  const projecao = turnoFim && turnoInicio
    ? ritmoAtual * ((turnoFim.getTime() - turnoInicio.getTime()) / 3600000)
    : totalProduzido
  const progresso = metaDia > 0 ? Math.min((totalProduzido / metaDia) * 100, 100) : 0
  const efColor = eficienciaColor(eficiencia)

  // Scroll to current hour row
  const tbodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!tbodyRef.current) return
    const active = tbodyRef.current.querySelector('[data-active="true"]') as HTMLElement
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [linhas])

  if (loading) return <div style={{ color: '#888', padding: '60px', textAlign: 'center', background: '#111', minHeight: '100vh' }}>Carregando...</div>

  return (
    <div style={{ background: '#111', minHeight: '100vh', color: '#F5F5F5', fontFamily: 'Barlow Condensed, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', background: '#1C1C1C', borderBottom: '1px solid #2A2A2A', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/setor" style={{ color: '#555', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
            <ArrowLeft size={13} /> Setores
          </Link>
          <div>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {setor}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setMetaEditOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: '4px', color: '#888', padding: '5px 10px', cursor: 'pointer', fontSize: '12px', letterSpacing: '0.05em' }}>
            <Settings size={12} /> Meta
          </button>
          <button onClick={() => setPaused(p => !p)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: '4px', color: paused ? '#F5A623' : '#888', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}>
            {paused ? <Play size={12} /> : <Pause size={12} />}
          </button>
          <button onClick={() => document.documentElement.requestFullscreen?.()}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid #2A2A2A', borderRadius: '4px', color: '#888', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}>
            <Maximize2 size={12} />
          </button>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#F5A623', letterSpacing: '0.05em', minWidth: '100px', textAlign: 'right' }}>
            {pad(agora.getHours())}:{pad(agora.getMinutes())}:{pad(agora.getSeconds())}
          </div>
        </div>
      </div>

      {/* Sector title */}
      <div style={{ padding: '16px 20px 8px', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F5F5F5', lineHeight: 1 }}>
          {setor}
        </h1>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '4px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          — Hora a Hora — Turno Atual
        </div>
      </div>

      {/* Main content: table + KPIs */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 0, overflow: 'hidden', minHeight: 0 }}>

        {/* Table */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #2A2A2A' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 80px 100px 100px 120px', padding: '8px 20px', background: '#1A1A1A', borderBottom: '1px solid #2A2A2A', flexShrink: 0 }}>
            {['HORA', `META/${unidade.toUpperCase()}`, 'REALIZADO', 'ACUM.', 'STATUS'].map(h => (
              <div key={h} style={{ fontSize: '11px', color: '#555', letterSpacing: '0.1em' }}>{h}</div>
            ))}
          </div>
          {/* Rows */}
          <div ref={tbodyRef} style={{ flex: 1, overflowY: 'auto' }}>
            {linhas.length === 0 ? (
              <div style={{ padding: '40px', color: '#555', textAlign: 'center' }}>
                Configure a meta do turno clicando em "Meta"
              </div>
            ) : linhas.map((l, i) => {
              const isAtivo = now >= l.inicio && now < l.fim
              const isPast = now >= l.fim
              return (
                <div key={i} data-active={isAtivo ? 'true' : 'false'}
                  style={{
                    display: 'grid', gridTemplateColumns: '120px 80px 100px 100px 120px',
                    padding: '10px 20px',
                    background: isAtivo ? '#1A2A1A' : 'transparent',
                    borderBottom: '1px solid #1E1E1E',
                    borderLeft: isAtivo ? '3px solid #4CAF50' : '3px solid transparent',
                  }}>
                  <div style={{ fontSize: '15px', color: isAtivo ? '#F5F5F5' : isPast ? '#888' : '#444', fontWeight: isAtivo ? 700 : 400 }}>
                    {l.hora}
                  </div>
                  <div style={{ fontSize: '15px', color: '#555' }}>{l.meta_h > 0 ? fmtNum(l.meta_h) : '—'}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: isPast || isAtivo ? statusColor(l.status) : '#333' }}>
                    {l.realizado > 0 ? fmtNum(l.realizado) : isPast ? '0' : '—'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: isPast || isAtivo ? (l.status === 'ABX' ? '#F44336' : '#F5F5F5') : '#333' }}>
                    {l.acumulado > 0 ? fmtNum(l.acumulado) : '—'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: statusColor(l.status), letterSpacing: '0.05em' }}>
                    {l.status !== 'FUTURO' ? statusLabel(l.status) : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* KPI Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', padding: '16px' }}>

          {/* Meta do dia */}
          <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '14px 18px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Meta do Dia</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '36px', fontWeight: 700, color: '#F5A623' }}>{metaDia > 0 ? fmtNum(metaDia) : '—'}</span>
              <span style={{ fontSize: '14px', color: '#888', textTransform: 'uppercase' }}>{unidade}</span>
            </div>
          </div>

          {/* Produção acumulada */}
          <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '14px 18px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Produção Acumulada</div>
            <div style={{ fontSize: '72px', fontWeight: 700, color: efColor, lineHeight: 1 }}>
              {fmtNum(totalProduzido)}
            </div>
          </div>

          {/* Eficiência */}
          <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '14px 18px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Eficiência</div>
              {metaDia > 0 && (
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: '4px', background: efColor + '22', color: efColor }}>
                  {eficiencia >= 95 ? '● NO PLANO' : eficiencia >= 75 ? '! ATENÇÃO' : '● ABAIXO DO PLANEJADO'}
                </div>
              )}
            </div>
            <div style={{ fontSize: '56px', fontWeight: 700, color: efColor, lineHeight: 1 }}>
              {metaDia > 0 ? fmtPct(eficiencia) : '—'}
            </div>
          </div>

          {/* Progresso */}
          <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '14px 18px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Progresso do Dia</div>
              <div style={{ fontSize: '12px', color: efColor }}>{fmtPct(progresso)}</div>
            </div>
            <div style={{ height: '8px', background: '#2A2A2A', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progresso}%`, background: efColor, borderRadius: '4px', transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '10px', color: '#444' }}>0</span>
              <span style={{ fontSize: '10px', color: '#444' }}>Meta: {fmtNum(metaDia)}</span>
            </div>
          </div>

          {/* Ritmo */}
          <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '14px 18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Ritmo Atual', value: ritmoAtual > 0 ? fmtNum(Math.round(ritmoAtual)) : '—', sub: `${unidade}/HORA`, color: efColor },
                { label: 'Necessário', value: ritmoNecessario > 0 && minRestantes > 0 ? fmtNum(Math.round(ritmoNecessario)) : '—', sub: `${unidade}/HORA`, color: '#888' },
                { label: 'Projeção', value: projecao > 0 ? fmtNum(Math.round(projecao)) : '—', sub: `${unidade} FINAL`, color: projecao >= metaDia ? '#4CAF50' : '#F44336' },
              ].map(k => (
                <div key={k.label}>
                  <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{k.label}</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: '9px', color: '#444', marginTop: '2px', letterSpacing: '0.06em' }}>{k.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '6px 20px', background: '#1C1C1C', borderTop: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          FLUXO · DEFINE · RESULTADO
        </div>
        <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.08em' }}>▌ RITMOPROD</div>
      </div>

      {/* Meta edit modal */}
      {metaEditOpen && (
        <MetaModal setor={setor} onClose={() => setMetaEditOpen(false)} onSaved={() => { setMetaEditOpen(false); fetchData() }} />
      )}
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
    const hoje = hojeStr()
    await (supabase as any).from('metas_setor').upsert({
      setor,
      data: hoje,
      meta_dia: parseFloat(metaDia) || 0,
      turno_inicio: turnoInicio,
      turno_fim: turnoFim,
      intervalo_inicio: intervaloInicio || null,
      intervalo_fim: intervaloFim || null,
      unidade,
    }, { onConflict: 'setor,data' })
    setSaving(false)
    onSaved()
  }

  const inp = { background: '#111', border: '1px solid #2A2A2A', color: '#F5F5F5', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '28px', width: '360px', maxWidth: '90vw' }}>
        <h2 style={{ margin: '0 0 20px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '20px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5A623' }}>
          Meta do Turno — {setor}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Meta do Dia</label>
            <input type="number" value={metaDia} onChange={e => setMetaDia(e.target.value)} placeholder="ex: 2279" style={inp} />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Unidade</label>
            <input type="text" value={unidade} onChange={e => setUnidade(e.target.value)} placeholder="pç, cx, m²..." style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Início Turno</label>
              <input type="time" value={turnoInicio} onChange={e => setTurnoInicio(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Fim Turno</label>
              <input type="time" value={turnoFim} onChange={e => setTurnoFim(e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: '12px' }}>
            <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Intervalo (almoço)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Início</label>
                <input type="time" value={intervaloInicio} onChange={e => setIntervaloInicio(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Fim</label>
                <input type="time" value={intervaloFim} onChange={e => setIntervaloFim(e.target.value)} style={inp} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#2A2A2A', border: 'none', borderRadius: '6px', color: '#888', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '10px', background: '#F5A623', border: 'none', borderRadius: '6px', color: '#111', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar Meta'}
          </button>
        </div>
      </div>
    </div>
  )
}
