'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  Package,
  AlertTriangle,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react'
import type { ApontamentoComRelacoes, TurnoEnum } from '@/types/database'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const turnoLabel: Record<TurnoEnum, string> = {
  MANHA: 'Manhã',
  TARDE: 'Tarde',
  NOITE: 'Noite',
}

const turnoVariant: Record<TurnoEnum, 'manha' | 'tarde' | 'noite'> = {
  MANHA: 'manha',
  TARDE: 'tarde',
  NOITE: 'noite',
}

function formatNumber(n: number) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function formatDateTime(dt: string) {
  return new Date(dt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type ApontamentoFull = {
  id: string
  quantidade_produzida: number
  quantidade_refugo: number
  quantidade_retrabalho: number
  data_inicio: string
  turno: string
  ordem_producao_id: string
  ordens_producao: { numero: string; quantidade_planejada: number; status: string; produtos: { codigo: string; descricao: string } | null } | null
  produtos: { codigo: string; descricao: string; unidade_medida: string } | null
  funcionarios: { matricula: string; nome: string } | null
  maquinas: { codigo: string; descricao: string } | null
}

type OrdemProgress = {
  id: string
  numero: string
  produto_codigo: string
  produto_descricao: string
  quantidade_planejada: number
  quantidade_produzida: number
  status: string
}

type FuncionarioEficiencia = {
  nome: string
  produzido: number
  refugo: number
  retrabalho: number
  eficiencia: number
}

type MaquinaEficiencia = {
  codigo: string
  descricao: string
  produzido: number
  refugo: number
  retrabalho: number
  eficiencia: number
}

type TurnoFilter = 'TODOS' | TurnoEnum

export default function DashboardPage() {
  const [allApontamentos, setAllApontamentos] = useState<ApontamentoFull[]>([])
  const [recentApontamentos, setRecentApontamentos] = useState<ApontamentoComRelacoes[]>([])
  const [activeOPs, setActiveOPs] = useState<OrdemProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [turnoFilter, setTurnoFilter] = useState<TurnoFilter>('TODOS')

  useEffect(() => {
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    Promise.all([
      supabase
        .from('apontamentos')
        .select(`
          id, quantidade_produzida, quantidade_refugo, quantidade_retrabalho,
          data_inicio, turno, ordem_producao_id,
          ordens_producao(numero, quantidade_planejada, status, produtos(codigo, descricao)),
          produtos(codigo, descricao, unidade_medida),
          funcionarios(matricula, nome),
          maquinas(codigo, descricao)
        `)
        .gte('data_inicio', today.toISOString())
        .lte('data_inicio', todayEnd.toISOString()),
      supabase
        .from('apontamentos')
        .select(
          `id, quantidade_produzida, quantidade_refugo, quantidade_retrabalho, data_inicio, turno, created_at,
          ordens_producao(numero),
          produtos(codigo, descricao, unidade_medida),
          funcionarios(matricula, nome),
          maquinas(codigo, descricao)`
        )
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('ordens_producao')
        .select(`id, numero, quantidade_planejada, status, produtos(codigo, descricao)`)
        .in('status', ['ABERTA', 'EM_ANDAMENTO']),
    ]).then(([todayRes, recentRes, opsRes]) => {
      setAllApontamentos((todayRes.data ?? []) as unknown as ApontamentoFull[])
      setRecentApontamentos((recentRes.data ?? []) as unknown as ApontamentoComRelacoes[])

      // For active OPs, get total produced via apontamentos
      const ops = (opsRes.data ?? []) as unknown as Array<{
        id: string; numero: string; quantidade_planejada: number; status: string
        produtos: { codigo: string; descricao: string } | null
      }>

      if (ops.length > 0) {
        const opIds = ops.map((o) => o.id)
        supabase
          .from('apontamentos')
          .select('ordem_producao_id, quantidade_produzida')
          .in('ordem_producao_id', opIds)
          .then(({ data: apData }) => {
            const prodByOp: Record<string, number> = {}
            for (const ap of (apData ?? []) as Array<{ ordem_producao_id: string; quantidade_produzida: number }>) {
              prodByOp[ap.ordem_producao_id] = (prodByOp[ap.ordem_producao_id] ?? 0) + Number(ap.quantidade_produzida)
            }
            setActiveOPs(
              ops.map((op) => ({
                id: op.id,
                numero: op.numero,
                produto_codigo: op.produtos?.codigo ?? '',
                produto_descricao: op.produtos?.descricao ?? '',
                quantidade_planejada: op.quantidade_planejada,
                quantidade_produzida: prodByOp[op.id] ?? 0,
                status: op.status,
              }))
            )
            setLoading(false)
          })
      } else {
        setActiveOPs([])
        setLoading(false)
      }
    })
  }, [])

  // Filtered apontamentos based on turno
  const filteredApontamentos = useMemo(() => {
    if (turnoFilter === 'TODOS') return allApontamentos
    return allApontamentos.filter((a) => a.turno === turnoFilter)
  }, [allApontamentos, turnoFilter])

  // Stats
  const totalProduzido = filteredApontamentos.reduce((s, a) => s + Number(a.quantidade_produzida), 0)
  const totalRefugo = filteredApontamentos.reduce((s, a) => s + Number(a.quantidade_refugo), 0)
  const totalRetrabalho = filteredApontamentos.reduce((s, a) => s + Number(a.quantidade_retrabalho), 0)
  const totalBruto = totalProduzido + totalRefugo + totalRetrabalho
  const eficiencia = totalBruto > 0 ? ((totalProduzido / totalBruto) * 100).toFixed(1) : '—'

  // Hourly chart data
  const hourlyData = useMemo(() => {
    const byHour: Record<number, number> = {}
    for (const a of filteredApontamentos) {
      const h = new Date(a.data_inicio).getHours()
      byHour[h] = (byHour[h] ?? 0) + Number(a.quantidade_produzida)
    }
    const hours = Object.keys(byHour).map(Number).sort((a, b) => a - b)
    if (hours.length === 0) return { labels: [], values: [] }
    const minH = Math.max(0, hours[0] - 1)
    const maxH = Math.min(23, hours[hours.length - 1] + 1)
    const labels: string[] = []
    const values: number[] = []
    for (let h = minH; h <= maxH; h++) {
      labels.push(`${String(h).padStart(2, '0')}h`)
      values.push(byHour[h] ?? 0)
    }
    return { labels, values }
  }, [filteredApontamentos])

  // Eficiência por funcionário
  const funcionarioEficiencia = useMemo((): FuncionarioEficiencia[] => {
    const map: Record<string, { nome: string; produzido: number; refugo: number; retrabalho: number }> = {}
    for (const a of filteredApontamentos) {
      const nome = a.funcionarios?.nome ?? 'N/A'
      if (!map[nome]) map[nome] = { nome, produzido: 0, refugo: 0, retrabalho: 0 }
      map[nome].produzido += Number(a.quantidade_produzida)
      map[nome].refugo += Number(a.quantidade_refugo)
      map[nome].retrabalho += Number(a.quantidade_retrabalho)
    }
    return Object.values(map).map((f) => {
      const bruto = f.produzido + f.refugo + f.retrabalho
      return { ...f, eficiencia: bruto > 0 ? (f.produzido / bruto) * 100 : 0 }
    }).sort((a, b) => b.produzido - a.produzido)
  }, [filteredApontamentos])

  // Eficiência por máquina
  const maquinaEficiencia = useMemo((): MaquinaEficiencia[] => {
    const map: Record<string, { codigo: string; descricao: string; produzido: number; refugo: number; retrabalho: number }> = {}
    for (const a of filteredApontamentos) {
      const codigo = a.maquinas?.codigo ?? 'N/A'
      if (!map[codigo]) map[codigo] = { codigo, descricao: a.maquinas?.descricao ?? '', produzido: 0, refugo: 0, retrabalho: 0 }
      map[codigo].produzido += Number(a.quantidade_produzida)
      map[codigo].refugo += Number(a.quantidade_refugo)
      map[codigo].retrabalho += Number(a.quantidade_retrabalho)
    }
    return Object.values(map).map((m) => {
      const bruto = m.produzido + m.refugo + m.retrabalho
      return { ...m, eficiencia: bruto > 0 ? (m.produzido / bruto) * 100 : 0 }
    }).sort((a, b) => b.produzido - a.produzido)
  }, [filteredApontamentos])

  function eficienciaColor(pct: number) {
    if (pct >= 90) return '#4CAF50'
    if (pct >= 70) return '#FF9800'
    return '#F44336'
  }

  function progressColor(pct: number) {
    if (pct >= 100) return '#4CAF50'
    if (pct >= 80) return '#FF9800'
    return '#F5A623'
  }

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  const chartData = {
    labels: hourlyData.labels,
    datasets: [
      {
        label: 'Produzido',
        data: hourlyData.values,
        backgroundColor: '#F5A623',
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#222222',
        borderColor: '#2A2A2A',
        borderWidth: 1,
        titleColor: '#F5F5F5',
        bodyColor: '#888888',
      },
    },
    scales: {
      x: {
        grid: { color: '#2A2A2A' },
        ticks: { color: '#888888', font: { family: 'IBM Plex Mono', size: 11 } },
        border: { color: '#2A2A2A' },
      },
      y: {
        grid: { color: '#2A2A2A' },
        ticks: { color: '#888888', font: { family: 'IBM Plex Mono', size: 11 } },
        border: { color: '#2A2A2A' },
      },
    },
  } as const

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontWeight: 700,
            fontSize: '28px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#F5F5F5',
            margin: 0,
          }}>Dashboard</h1>
          <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px', fontFamily: 'Barlow, sans-serif' }}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <Button asChild>
          <Link href="/apontamentos/novo">
            <Plus className="h-4 w-4" />
            Novo Apontamento
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {[
          { label: 'Apontamentos', value: filteredApontamentos.length, sub: 'registros no dia', color: '#F5A623', Icon: ClipboardList },
          { label: 'Total Produzido', value: formatNumber(totalProduzido), sub: 'unidades produzidas', color: '#4CAF50', Icon: Package },
          { label: 'Total Refugo', value: formatNumber(totalRefugo), sub: 'unidades refugadas', color: '#F44336', Icon: AlertTriangle },
          { label: 'Eficiência', value: `${eficiencia}${eficiencia !== '—' ? '%' : ''}`, sub: 'prod / (prod+ref+ret)', color: '#F5A623', Icon: TrendingUp },
        ].map(({ label, value, sub, color, Icon }) => (
          <div key={label} style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888888' }}>{label}</span>
              <Icon size={16} style={{ color, flexShrink: 0 }} />
            </div>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '28px', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#555', marginTop: '6px' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Turno filter */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#888888', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: '4px' }}>Turno:</span>
        {(['TODOS', 'MANHA', 'TARDE'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTurnoFilter(t)}
            style={{
              padding: '4px 14px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: turnoFilter === t ? '#F5A623' : '#2A2A2A',
              background: turnoFilter === t ? '#F5A623' : 'transparent',
              color: turnoFilter === t ? '#111111' : '#888888',
              fontFamily: 'Barlow Condensed, sans-serif',
              fontWeight: 600,
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t === 'TODOS' ? 'Todos' : t === 'MANHA' ? 'Manhã' : 'Tarde'}
          </button>
        ))}
      </div>

      {/* Hourly chart + OP Progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produção por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyData.labels.length === 0 ? (
              <div style={{ color: '#888888', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
                Nenhum dado para o período selecionado
              </div>
            ) : (
              <div style={{ height: '220px' }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progresso das OPs Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            {activeOPs.length === 0 ? (
              <div style={{ color: '#888888', textAlign: 'center', padding: '40px 0', fontSize: '13px' }}>
                Nenhuma OP ativa no momento
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '240px', overflowY: 'auto' }}>
                {activeOPs.map((op) => {
                  const pct = op.quantidade_planejada > 0
                    ? Math.min(100, (op.quantidade_produzida / op.quantidade_planejada) * 100)
                    : 0
                  const color = progressColor(pct)
                  return (
                    <div key={op.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div>
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#F5A623', marginRight: '8px' }}>
                            {op.numero}
                          </span>
                          <span style={{ fontSize: '12px', color: '#F5F5F5' }}>{op.produto_codigo}</span>
                          <span style={{ fontSize: '11px', color: '#888888', marginLeft: '6px' }}>{op.produto_descricao}</span>
                        </div>
                        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color, fontWeight: 600 }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#2A2A2A', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
                        </div>
                      </div>
                      <div style={{ marginTop: '2px', fontSize: '10px', color: '#888888', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {formatNumber(op.quantidade_produzida)} / {formatNumber(op.quantidade_planejada)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Eficiência por Funcionário + Máquina */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Eficiência por Funcionário</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {funcionarioEficiencia.length === 0 ? (
              <div style={{ color: '#888888', textAlign: 'center', padding: '30px', fontSize: '13px' }}>Sem dados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2A2A', background: '#222222' }}>
                      {['Funcionário', 'Produzido', 'Refugo', 'Retrabalho', 'Eficiência'].map((h, i) => (
                        <th key={h} className={`px-4 py-2 ${i >= 1 ? 'text-right' : 'text-left'} font-bold text-xs tracking-widest uppercase`}
                          style={{ color: '#888888', fontFamily: 'Barlow Condensed, sans-serif' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {funcionarioEficiencia.map((f) => (
                      <tr key={f.nome} style={{ borderBottom: '1px solid #1C1C1C' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#222222')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-4 py-2" style={{ color: '#F5F5F5', fontSize: '13px' }}>{f.nome}</td>
                        <td className="px-4 py-2 text-right" style={{ color: '#4CAF50', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{formatNumber(f.produzido)}</td>
                        <td className="px-4 py-2 text-right" style={{ color: '#F44336', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{formatNumber(f.refugo)}</td>
                        <td className="px-4 py-2 text-right" style={{ color: '#FF9800', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{formatNumber(f.retrabalho)}</td>
                        <td className="px-4 py-2 text-right" style={{ color: eficienciaColor(f.eficiencia), fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', fontWeight: 600 }}>
                          {f.eficiencia.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eficiência por Máquina</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {maquinaEficiencia.length === 0 ? (
              <div style={{ color: '#888888', textAlign: 'center', padding: '30px', fontSize: '13px' }}>Sem dados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2A2A', background: '#222222' }}>
                      {['Máquina', 'Produzido', 'Refugo', 'Retrabalho', 'Eficiência'].map((h, i) => (
                        <th key={h} className={`px-4 py-2 ${i >= 1 ? 'text-right' : 'text-left'} font-bold text-xs tracking-widest uppercase`}
                          style={{ color: '#888888', fontFamily: 'Barlow Condensed, sans-serif' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {maquinaEficiencia.map((m) => (
                      <tr key={m.codigo} style={{ borderBottom: '1px solid #1C1C1C' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#222222')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-4 py-2" style={{ color: '#F5F5F5', fontSize: '13px' }}>
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', color: '#F5A623' }}>{m.codigo}</span>
                          <span style={{ fontSize: '11px', color: '#888888', marginLeft: '6px' }}>{m.descricao}</span>
                        </td>
                        <td className="px-4 py-2 text-right" style={{ color: '#4CAF50', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{formatNumber(m.produzido)}</td>
                        <td className="px-4 py-2 text-right" style={{ color: '#F44336', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{formatNumber(m.refugo)}</td>
                        <td className="px-4 py-2 text-right" style={{ color: '#FF9800', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{formatNumber(m.retrabalho)}</td>
                        <td className="px-4 py-2 text-right" style={{ color: eficienciaColor(m.eficiencia), fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', fontWeight: 600 }}>
                          {m.eficiencia.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Apontamentos Recentes</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/apontamentos">
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentApontamentos.length === 0 ? (
            <div className="py-12 text-center" style={{ color: '#888888' }}>
              <ClipboardList className="h-10 w-10 mx-auto mb-3" style={{ color: '#3A3A3A' }} />
              <p className="text-sm">Nenhum apontamento registrado ainda.</p>
              <Button className="mt-4" size="sm" asChild>
                <Link href="/apontamentos/novo">Criar primeiro apontamento</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #2A2A2A', background: '#222222' }}>
                    {['OP', 'Produto', 'Funcionário', 'Máquina', 'Produzido', 'Refugo', 'Turno', 'Início'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 ${i >= 4 && i <= 5 ? 'text-right' : 'text-left'} font-bold text-xs tracking-widest uppercase`}
                        style={{ color: '#888888', fontFamily: 'Barlow Condensed, sans-serif' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentApontamentos.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #1C1C1C' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#222222')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: '#F5A623', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
                        {a.ordens_producao?.numero}
                      </td>
                      <td className="px-4 py-3" style={{ color: '#F5F5F5' }}>
                        <div className="font-medium" style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{a.produtos?.codigo}</div>
                        <div className="truncate max-w-[160px]" style={{ fontSize: '11px', color: '#888888' }}>
                          {a.produtos?.descricao}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#F5F5F5', fontSize: '13px' }}>{a.funcionarios?.nome}</td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#F5F5F5', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{a.maquinas?.codigo}</td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: '#4CAF50', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
                        {formatNumber(Number(a.quantidade_produzida))}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: '#F44336', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
                        {formatNumber(Number(a.quantidade_refugo))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={turnoVariant[a.turno as TurnoEnum]}>
                          {turnoLabel[a.turno as TurnoEnum]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#888888', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px' }}>
                        {formatDateTime(a.data_inicio)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
