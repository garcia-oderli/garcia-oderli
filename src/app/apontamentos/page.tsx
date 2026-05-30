import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApontamentosFilters } from '@/components/apontamentos-filters'
import { Pagination } from '@/components/pagination'
import { Plus, ClipboardList } from 'lucide-react'
import type { ApontamentoComRelacoes, TurnoEnum } from '@/types/database'

export const metadata = {
  title: 'Apontamentos — Apontamento de Produção v1',
}

const PAGE_SIZE = 20

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
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
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

interface SearchParams {
  page?: string
  data_inicio?: string
  data_fim?: string
  turno?: string
  funcionario_id?: string
  maquina_id?: string
}

export default async function ApontamentosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let data: any[] | null = null
  let count: number | null = null
  let funcionariosRes: { data: any[] | null } = { data: null }
  let maquinasRes: { data: any[] | null } = { data: null }

  if (supabase) {
    try {
      // Build query
      let query = supabase
        .from('apontamentos')
        .select(
          `id, quantidade_produzida, quantidade_refugo, quantidade_retrabalho, data_inicio, data_fim, turno, observacoes, created_at,
          ordens_producao(numero),
          produtos(codigo, descricao, unidade_medida),
          funcionarios(matricula, nome),
          maquinas(codigo, descricao)`,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (sp.data_inicio) {
        query = query.gte('data_inicio', new Date(sp.data_inicio).toISOString())
      }
      if (sp.data_fim) {
        const end = new Date(sp.data_fim)
        end.setHours(23, 59, 59, 999)
        query = query.lte('data_inicio', end.toISOString())
      }
      if (sp.turno && sp.turno !== 'all') {
        query = query.eq('turno', sp.turno)
      }
      if (sp.funcionario_id && sp.funcionario_id !== 'all') {
        query = query.eq('funcionario_id', sp.funcionario_id)
      }
      if (sp.maquina_id && sp.maquina_id !== 'all') {
        query = query.eq('maquina_id', sp.maquina_id)
      }

      const result = await query
      data = result.data
      count = result.count
    } catch {}

    try {
      // Fetch filter options
      const [fr, mr] = await Promise.all([
        supabase.from('funcionarios').select('id, matricula, nome, setor').order('nome'),
        supabase.from('maquinas').select('id, codigo, descricao, setor').order('codigo'),
      ])
      funcionariosRes = fr
      maquinasRes = mr
    } catch {}
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)
  const items = (data ?? []) as unknown as ApontamentoComRelacoes[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apontamentos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {count ?? 0} {(count ?? 0) === 1 ? 'registro encontrado' : 'registros encontrados'}
          </p>
        </div>
        <Button asChild>
          <Link href="/apontamentos/novo">
            <Plus className="h-4 w-4" />
            Novo Apontamento
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <ApontamentosFilters
        funcionarios={funcionariosRes.data ?? []}
        maquinas={maquinasRes.data ?? []}
      />

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold text-gray-900">
            Lista de Apontamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Nenhum apontamento encontrado com os filtros aplicados.</p>
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
                    <th className="px-4 py-3 text-right font-medium text-gray-500">Retrabalho</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-500">Efic.</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Turno</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Início</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Fim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((a) => {
                    const prod = Number(a.quantidade_produzida)
                    const ref = Number(a.quantidade_refugo)
                    const ret = Number(a.quantidade_retrabalho)
                    const total = prod + ref + ret
                    const eff = total > 0 ? ((prod / total) * 100).toFixed(0) : '—'

                    return (
                      <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-blue-600 whitespace-nowrap">
                          {a.ordens_producao?.numero}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="font-medium">{a.produtos?.codigo}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[140px]">
                            {a.produtos?.descricao}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {a.funcionarios?.nome}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {a.maquinas?.codigo}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatNumber(prod)}
                          <span className="text-xs text-gray-400 ml-1">
                            {a.produtos?.unidade_medida}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-red-600">
                          {ref > 0 ? formatNumber(ref) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600">
                          {ret > 0 ? formatNumber(ret) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-xs font-semibold ${
                              eff === '—'
                                ? 'text-gray-400'
                                : Number(eff) >= 90
                                ? 'text-green-700'
                                : Number(eff) >= 70
                                ? 'text-yellow-700'
                                : 'text-red-700'
                            }`}
                          >
                            {eff}{eff !== '—' ? '%' : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={turnoVariant[a.turno as TurnoEnum]}>
                            {turnoLabel[a.turno as TurnoEnum]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {formatDateTime(a.data_inicio)}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {formatDateTime(a.data_fim)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  )
}
