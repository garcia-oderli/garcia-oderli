'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApontamentosFilters } from '@/components/apontamentos-filters'
import { Pagination } from '@/components/pagination'
import { Plus, ClipboardList } from 'lucide-react'
import type { ApontamentoComRelacoes, TurnoEnum } from '@/types/database'

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

function ApontamentosPageInner() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ApontamentoComRelacoes[]>([])
  const [count, setCount] = useState<number>(0)
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [maquinas, setMaquinas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  useEffect(() => {
    setLoading(true)
    const supabase = createClient()

    const data_inicio = searchParams.get('data_inicio')
    const data_fim = searchParams.get('data_fim')
    const turno = searchParams.get('turno')
    const funcionario_id = searchParams.get('funcionario_id')
    const maquina_id = searchParams.get('maquina_id')

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

    if (data_inicio) {
      query = query.gte('data_inicio', new Date(data_inicio).toISOString())
    }
    if (data_fim) {
      const end = new Date(data_fim)
      end.setHours(23, 59, 59, 999)
      query = query.lte('data_inicio', end.toISOString())
    }
    if (turno && turno !== 'all') {
      query = query.eq('turno', turno)
    }
    if (funcionario_id && funcionario_id !== 'all') {
      query = query.eq('funcionario_id', funcionario_id)
    }
    if (maquina_id && maquina_id !== 'all') {
      query = query.eq('maquina_id', maquina_id)
    }

    Promise.all([
      query,
      supabase.from('funcionarios').select('id, matricula, nome, setor').order('nome'),
      supabase.from('maquinas').select('id, codigo, descricao, setor').order('codigo'),
    ]).then(([apontRes, funcRes, maqRes]) => {
      setItems((apontRes.data ?? []) as any)
      setCount(apontRes.count ?? 0)
      setFuncionarios(funcRes.data ?? [])
      setMaquinas(maqRes.data ?? [])
      setLoading(false)
    })
  }, [searchParams.toString()])

  const totalPages = Math.ceil(count / PAGE_SIZE)

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
          }}>Apontamentos</h1>
          <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
            {count} {count === 1 ? 'registro encontrado' : 'registros encontrados'}
          </p>
        </div>
        <Button asChild>
          <Link href="/apontamentos/novo">
            <Plus className="h-4 w-4" />
            Novo Apontamento
          </Link>
        </Button>
      </div>

      <ApontamentosFilters
        funcionarios={funcionarios}
        maquinas={maquinas}
      />

      {loading ? (
        <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Apontamentos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {items.length === 0 ? (
              <div className="py-12 text-center" style={{ color: '#888888' }}>
                <ClipboardList className="h-10 w-10 mx-auto mb-3" style={{ color: '#3A3A3A' }} />
                <p className="text-sm">Nenhum apontamento encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2A2A', background: '#222222' }}>
                      {['OP', 'Produto', 'Funcionário', 'Máquina', 'Produzido', 'Refugo', 'Retrabalho', 'Efic.', 'Turno', 'Início', 'Fim'].map((h, i) => (
                        <th key={h}
                          className={`px-4 py-3 font-bold text-xs tracking-widest uppercase ${
                            i >= 4 && i <= 7 ? 'text-right' : i === 7 ? 'text-center' : 'text-left'
                          }`}
                          style={{ color: '#888888', fontFamily: 'Barlow Condensed, sans-serif' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => {
                      const prod = Number(a.quantidade_produzida)
                      const ref = Number(a.quantidade_refugo)
                      const ret = Number(a.quantidade_retrabalho)
                      const total = prod + ref + ret
                      const eff = total > 0 ? ((prod / total) * 100).toFixed(0) : '—'
                      const effColor = eff === '—' ? '#888888' : Number(eff) >= 90 ? '#4CAF50' : Number(eff) >= 70 ? '#FF9800' : '#F44336'

                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid #1C1C1C' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#222222')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: '#F5A623', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>
                            {a.ordens_producao?.numero}
                          </td>
                          <td className="px-4 py-3" style={{ color: '#F5F5F5' }}>
                            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{a.produtos?.codigo}</div>
                            <div className="truncate max-w-[140px]" style={{ fontSize: '11px', color: '#888888' }}>
                              {a.produtos?.descricao}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#F5F5F5', fontSize: '13px' }}>
                            {a.funcionarios?.nome}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#F5F5F5', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>
                            {a.maquinas?.codigo}
                          </td>
                          <td className="px-4 py-3 text-right" style={{ color: '#4CAF50', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
                            {formatNumber(prod)}
                            <span style={{ fontSize: '10px', color: '#888888', marginLeft: '4px' }}>
                              {a.produtos?.unidade_medida}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right" style={{ color: '#F44336', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
                            {ref > 0 ? formatNumber(ref) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right" style={{ color: '#FF9800', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
                            {ret > 0 ? formatNumber(ret) : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span style={{ fontSize: '12px', fontWeight: 700, color: effColor, fontFamily: 'IBM Plex Mono, monospace' }}>
                              {eff}{eff !== '—' ? '%' : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={turnoVariant[a.turno as TurnoEnum]}>
                              {turnoLabel[a.turno as TurnoEnum]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#888888', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px' }}>
                            {formatDateTime(a.data_inicio)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#888888', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px' }}>
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
      )}

      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  )
}

export default function ApontamentosPage() {
  return (
    <Suspense fallback={<div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>}>
      <ApontamentosPageInner />
    </Suspense>
  )
}
