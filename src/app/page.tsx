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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Apontamentos Hoje
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {todayApontamentos.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">registros no dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Produzido</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{formatNumber(totalProduzido)}</div>
            <p className="text-xs text-gray-500 mt-1">unidades produzidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Refugo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatNumber(totalRefugo)}</div>
            <p className="text-xs text-gray-500 mt-1">unidades refugadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Eficiência</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">
              {eficiencia}{eficiencia !== '—' ? '%' : ''}
            </div>
            <p className="text-xs text-gray-500 mt-1">prod / (prod + refugo + retrab)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900">
            Apontamentos Recentes
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href="/apontamentos">
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Nenhum apontamento registrado ainda.</p>
              <Button className="mt-4" size="sm" asChild>
                <Link href="/apontamentos/novo">Criar primeiro apontamento</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">OP</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Produto</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Funcionário</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Máquina</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Produzido</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Refugo</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Turno</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Início</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-blue-600">
                        {a.ordens_producao?.numero}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        <div className="font-medium">{a.produtos?.codigo}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[160px]">
                          {a.produtos?.descricao}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{a.funcionarios?.nome}</td>
                      <td className="px-4 py-3 text-gray-700">{a.maquinas?.codigo}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatNumber(Number(a.quantidade_produzida))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {formatNumber(Number(a.quantidade_refugo))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={turnoVariant[a.turno as TurnoEnum]}>
                          {turnoLabel[a.turno as TurnoEnum]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
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
