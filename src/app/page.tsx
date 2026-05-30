import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  type StatsRow = { quantidade_produzida: number; quantidade_refugo: number; quantidade_retrabalho: number }

  let todayApontamentos: StatsRow[] = []
  let recentApontamentos: any[] = []

  if (supabase) {
    try {
      const { data: todayApontamentosRaw } = await supabase
        .from('apontamentos')
        .select('quantidade_produzida, quantidade_refugo, quantidade_retrabalho')
        .gte('created_at', today.toISOString())
        .lte('created_at', todayEnd.toISOString())
      todayApontamentos = (todayApontamentosRaw ?? []) as unknown as StatsRow[]
    } catch {}

    try {
      const { data } = await supabase
        .from('apontamentos')
        .select(
          `id, quantidade_produzida, quantidade_refugo, quantidade_retrabalho, data_inicio, turno, created_at,
          ordens_producao(numero),
          produtos(codigo, descricao, unidade_medida),
          funcionarios(matricula, nome),
          maquinas(codigo, descricao)`
        )
        .order('created_at', { ascending: false })
        .limit(10)
      recentApontamentos = data ?? []
    } catch {}
  }

  const totalProduzido = todayApontamentos.reduce(
    (sum, a) => sum + Number(a.quantidade_produzida),
    0
  )
  const totalRefugo = todayApontamentos.reduce(
    (sum, a) => sum + Number(a.quantidade_refugo),
    0
  )
  const totalRetrabalho = todayApontamentos.reduce(
    (sum, a) => sum + Number(a.quantidade_retrabalho),
    0
  )
  const totalBruto = totalProduzido + totalRefugo + totalRetrabalho
  const eficiencia = totalBruto > 0 ? ((totalProduzido / totalBruto) * 100).toFixed(1) : '—'

  const items = recentApontamentos as unknown as ApontamentoComRelacoes[]

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs">Apontamentos Hoje</CardTitle>
            <ClipboardList className="h-4 w-4" style={{ color: '#F5A623' }} />
          </CardHeader>
          <CardContent>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '32px', fontWeight: 600, color: '#F5A623' }}>
              {todayApontamentos.length}
            </div>
            <p style={{ fontSize: '11px', color: '#888888', marginTop: '4px' }}>registros no dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs">Total Produzido</CardTitle>
            <Package className="h-4 w-4" style={{ color: '#4CAF50' }} />
          </CardHeader>
          <CardContent>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '32px', fontWeight: 600, color: '#4CAF50' }}>
              {formatNumber(totalProduzido)}
            </div>
            <p style={{ fontSize: '11px', color: '#888888', marginTop: '4px' }}>unidades produzidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs">Total Refugo</CardTitle>
            <AlertTriangle className="h-4 w-4" style={{ color: '#F44336' }} />
          </CardHeader>
          <CardContent>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '32px', fontWeight: 600, color: '#F44336' }}>
              {formatNumber(totalRefugo)}
            </div>
            <p style={{ fontSize: '11px', color: '#888888', marginTop: '4px' }}>unidades refugadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs">Eficiência</CardTitle>
            <TrendingUp className="h-4 w-4" style={{ color: '#F5A623' }} />
          </CardHeader>
          <CardContent>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '32px', fontWeight: 600, color: '#F5A623' }}>
              {eficiencia}{eficiencia !== '—' ? '%' : ''}
            </div>
            <p style={{ fontSize: '11px', color: '#888888', marginTop: '4px' }}>prod / (prod + refugo + retrab)</p>
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
          {items.length === 0 ? (
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
                  {items.map((a) => (
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
