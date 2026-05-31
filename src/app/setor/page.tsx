'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, BarChart3, TrendingUp, TrendingDown, Users, Cpu, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type Periodo = 'hoje' | '7d' | '30d'

interface SetorStats {
  setor: string
  apontamentos: number
  produzido: number
  refugo: number
  eficiencia: number
  funcionarios: string[]
  maquinas: string[]
  ultima_atividade: string | null
}

function formatNum(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function formatPct(n: number) {
  return n.toFixed(1) + '%'
}

function formatRelative(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

function periodoLabel(p: Periodo) {
  return p === 'hoje' ? 'Hoje' : p === '7d' ? 'Últimos 7 dias' : 'Últimos 30 dias'
}

function eficienciaColor(e: number) {
  if (e >= 95) return '#4CAF50'
  if (e >= 80) return '#F5A623'
  return '#F44336'
}

export default function SetorPage() {
  const [stats, setStats] = useState<SetorStats[]>([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('hoje')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const now = new Date()
    let desde: string
    if (periodo === 'hoje') {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      desde = d.toISOString()
    } else if (periodo === '7d') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      desde = d.toISOString()
    } else {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      desde = d.toISOString()
    }

    const [apRes, funcRes, maqRes] = await Promise.all([
      (supabase as any)
        .from('apontamentos')
        .select('id, quantidade_produzida, quantidade_refugo, created_at, funcionario_id, maquina_id, funcionarios(setor, nome), maquinas(setor, codigo)')
        .gte('created_at', desde),
      (supabase as any).from('funcionarios').select('id, nome, setor'),
      (supabase as any).from('maquinas').select('id, codigo, setor'),
    ])

    const apontamentos: any[] = apRes.data ?? []
    const funcionarios: any[] = funcRes.data ?? []
    const maquinas: any[] = maqRes.data ?? []

    // Collect all sectors from all sources
    const setoresSet = new Set<string>()
    funcionarios.forEach((f: any) => f.setor && setoresSet.add(f.setor))
    maquinas.forEach((m: any) => m.setor && setoresSet.add(m.setor))
    apontamentos.forEach((a: any) => {
      if (a.funcionarios?.setor) setoresSet.add(a.funcionarios.setor)
      if (a.maquinas?.setor) setoresSet.add(a.maquinas.setor)
    })

    const result: SetorStats[] = Array.from(setoresSet).sort().map(setor => {
      const aps = apontamentos.filter((a: any) => a.funcionarios?.setor === setor || a.maquinas?.setor === setor)
      const produzido = aps.reduce((s: number, a: any) => s + (a.quantidade_produzida ?? 0), 0)
      const refugo = aps.reduce((s: number, a: any) => s + (a.quantidade_refugo ?? 0), 0)
      const total = produzido + refugo
      const eficiencia = total > 0 ? (produzido / total) * 100 : 100

      const funcIds = new Set(aps.map((a: any) => a.funcionario_id).filter(Boolean))
      const maqIds = new Set(aps.map((a: any) => a.maquina_id).filter(Boolean))

      const funcNomes = funcionarios.filter((f: any) => funcIds.has(f.id)).map((f: any) => f.nome)
      const maqCodigos = maquinas.filter((m: any) => maqIds.has(m.id)).map((m: any) => m.codigo)

      const ultima = aps.length > 0
        ? aps.reduce((max: string, a: any) => a.created_at > max ? a.created_at : max, aps[0].created_at)
        : null

      return {
        setor,
        apontamentos: aps.length,
        produzido,
        refugo,
        eficiencia,
        funcionarios: funcNomes,
        maquinas: maqCodigos,
        ultima_atividade: ultima,
      }
    })

    // Sort: sectors with apontamentos first, then by name
    result.sort((a, b) => {
      if (a.apontamentos !== b.apontamentos) return b.apontamentos - a.apontamentos
      return a.setor.localeCompare(b.setor)
    })

    setStats(result)
    setLastUpdate(new Date())
    setLoading(false)
  }, [periodo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 2 min
  useEffect(() => {
    const t = setInterval(fetchData, 120000)
    return () => clearInterval(t)
  }, [fetchData])

  const totalProduzido = stats.reduce((s, x) => s + x.produzido, 0)
  const totalRefugo = stats.reduce((s, x) => s + x.refugo, 0)
  const totalAp = stats.reduce((s, x) => s + x.apontamentos, 0)
  const totalEfic = (totalProduzido + totalRefugo) > 0
    ? (totalProduzido / (totalProduzido + totalRefugo)) * 100
    : 100

  const periodos: Periodo[] = ['hoje', '7d', '30d']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div>
            <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: isMobile ? '22px' : '28px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5F5F5', margin: 0 }}>
              PAINEL POR SETOR
            </h1>
            <p style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
              {lastUpdate ? `Atualizado ${formatRelative(lastUpdate.toISOString())}` : 'Carregando...'}
            </p>
          </div>
          <button onClick={fetchData} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
        {/* Period selector — full width on mobile */}
        <div style={{ display: 'flex', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '6px', overflow: 'hidden' }}>
          {periodos.map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ flex: 1, padding: '9px 8px', fontSize: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', background: periodo === p ? '#F5A623' : 'transparent', color: periodo === p ? '#111' : '#888', transition: 'background 0.15s' }}>
              {isMobile ? (p === 'hoje' ? 'Hoje' : p === '7d' ? '7 dias' : '30 dias') : periodoLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Totals row — 2x2 on mobile, 4 cols on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { label: 'Apontamentos', value: formatNum(totalAp), icon: <BarChart3 size={18} />, color: '#4A9EDF' },
          { label: 'Produzido', value: formatNum(totalProduzido), icon: <TrendingUp size={18} />, color: '#4CAF50' },
          { label: 'Refugo', value: formatNum(totalRefugo), icon: <TrendingDown size={18} />, color: '#F44336' },
          { label: 'Eficiência Geral', value: formatPct(totalEfic), icon: <BarChart3 size={18} />, color: eficienciaColor(totalEfic) },
        ].map(card => (
          <div key={card.label} style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666' }}>{card.label}</span>
              <span style={{ color: card.color }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: card.color, fontFamily: 'Barlow Condensed, sans-serif' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Sector cards */}
      {loading ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '60px' }}>Carregando...</div>
      ) : stats.length === 0 ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '60px' }}>Nenhum dado encontrado para o período.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {stats.map(s => (
            <SetorCard key={s.setor} s={s} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function SetorCard({ s }: { s: SetorStats }) {
  const efColor = eficienciaColor(s.eficiencia)
  const barWidth = Math.min(s.eficiencia, 100)
  const hasActivity = s.apontamentos > 0

  return (
    <div style={{ background: '#1C1C1C', border: `1px solid ${hasActivity ? '#3A3A3A' : '#2A2A2A'}`, borderRadius: '10px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href={`/setor/${encodeURIComponent(s.setor)}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '17px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5F5F5', margin: 0 }}>
            {s.setor}
          </h2>
          <ExternalLink size={12} style={{ color: '#555' }} />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasActivity && (
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#4CAF50', boxShadow: '0 0 6px #4CAF5099' }} />
          )}
          <span style={{ fontSize: '11px', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.05em' }}>
            {s.ultima_atividade ? formatRelative(s.ultima_atividade) : 'sem atividade'}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', borderBottom: '1px solid #2A2A2A' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Apontamentos</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#4A9EDF', fontFamily: 'Barlow Condensed, sans-serif' }}>{s.apontamentos}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Produzido</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#4CAF50', fontFamily: 'Barlow Condensed, sans-serif' }}>{formatNum(s.produzido)}</div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Refugo</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: s.refugo > 0 ? '#F44336' : '#555', fontFamily: 'Barlow Condensed, sans-serif' }}>{formatNum(s.refugo)}</div>
        </div>
      </div>

      {/* Efficiency bar */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2A2A' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '10px', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Eficiência</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: efColor, fontFamily: 'Barlow Condensed, sans-serif' }}>{formatPct(s.eficiencia)}</span>
        </div>
        <div style={{ height: '4px', background: '#2A2A2A', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${barWidth}%`, background: efColor, borderRadius: '2px', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Operators & Machines */}
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
            <Users size={11} style={{ color: '#555' }} />
            <span style={{ fontSize: '10px', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Operadores ativos</span>
          </div>
          {s.funcionarios.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#444' }}>—</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {s.funcionarios.slice(0, 4).map(nome => (
                <span key={nome} style={{ fontSize: '10px', background: '#1A2A3A', border: '1px solid #2A4A6A', color: '#4A9EDF', borderRadius: '3px', padding: '2px 6px', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.04em' }}>
                  {nome.split(' ')[0]}
                </span>
              ))}
              {s.funcionarios.length > 4 && (
                <span style={{ fontSize: '10px', color: '#555' }}>+{s.funcionarios.length - 4}</span>
              )}
            </div>
          )}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
            <Cpu size={11} style={{ color: '#555' }} />
            <span style={{ fontSize: '10px', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Máquinas ativas</span>
          </div>
          {s.maquinas.length === 0 ? (
            <span style={{ fontSize: '12px', color: '#444' }}>—</span>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {s.maquinas.slice(0, 4).map(cod => (
                <span key={cod} style={{ fontSize: '10px', background: '#1A1A2A', border: '1px solid #3A3A5A', color: '#888', borderRadius: '3px', padding: '2px 6px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.06em' }}>
                  {cod}
                </span>
              ))}
              {s.maquinas.length > 4 && (
                <span style={{ fontSize: '10px', color: '#555' }}>+{s.maquinas.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
