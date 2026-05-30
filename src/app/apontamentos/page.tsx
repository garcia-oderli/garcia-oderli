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
import { Plus, ClipboardList, Pencil, Trash2, Check, X } from 'lucide-react'
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

function toLocalDatetimeValue(isoString: string) {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function ApontamentosPageInner() {
  const searchParams = useSearchParams()
  const [items, setItems] = useState<ApontamentoComRelacoes[]>([])
  const [count, setCount] = useState<number>(0)
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [maquinas, setMaquinas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    quantidade_produzida: string
    quantidade_refugo: string
    quantidade_retrabalho: string
    data_inicio: string
    data_fim: string
    turno: string
    observacoes: string
  }>({ quantidade_produzida: '', quantidade_refugo: '0', quantidade_retrabalho: '0', data_inicio: '', data_fim: '', turno: 'MANHA', observacoes: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const fetchData = () => {
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

    if (data_inicio) query = query.gte('data_inicio', new Date(data_inicio).toISOString())
    if (data_fim) {
      const end = new Date(data_fim)
      end.setHours(23, 59, 59, 999)
      query = query.lte('data_inicio', end.toISOString())
    }
    if (turno && turno !== 'all') query = query.eq('turno', turno)
    if (funcionario_id && funcionario_id !== 'all') query = query.eq('funcionario_id', funcionario_id)
    if (maquina_id && maquina_id !== 'all') query = query.eq('maquina_id', maquina_id)

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
  }

  useEffect(() => {
    fetchData()
  }, [searchParams.toString()])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  const startEdit = (a: ApontamentoComRelacoes) => {
    setEditingId(a.id)
    setEditError(null)
    setEditValues({
      quantidade_produzida: String(a.quantidade_produzida),
      quantidade_refugo: String(a.quantidade_refugo),
      quantidade_retrabalho: String(a.quantidade_retrabalho),
      data_inicio: toLocalDatetimeValue(a.data_inicio),
      data_fim: toLocalDatetimeValue(a.data_fim),
      turno: a.turno,
      observacoes: a.observacoes ?? '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditError(null)
  }

  const saveEdit = async (id: string) => {
    setEditSaving(true)
    setEditError(null)
    if (new Date(editValues.data_fim) <= new Date(editValues.data_inicio)) {
      setEditError('A data/hora de fim deve ser posterior ao início.')
      setEditSaving(false)
      return
    }
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('apontamentos') as any)
      .update({
        quantidade_produzida: Number(editValues.quantidade_produzida),
        quantidade_refugo: Number(editValues.quantidade_refugo) || 0,
        quantidade_retrabalho: Number(editValues.quantidade_retrabalho) || 0,
        data_inicio: new Date(editValues.data_inicio).toISOString(),
        data_fim: new Date(editValues.data_fim).toISOString(),
        turno: editValues.turno,
        observacoes: editValues.observacoes.trim() || null,
      })
      .eq('id', id)
    if (dbError) {
      setEditError(dbError.message)
    } else {
      setEditingId(null)
      fetchData()
    }
    setEditSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este apontamento? Esta ação não pode ser desfeita.')) return
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('apontamentos') as any).delete().eq('id', id)
    if (!dbError) fetchData()
  }

  const inputStyle: React.CSSProperties = { background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', outline: 'none' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '28px', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#F5F5F5', margin: 0 }}>
            Apontamentos
          </h1>
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

      <ApontamentosFilters funcionarios={funcionarios} maquinas={maquinas} />

      {editError && (
        <div className="rounded px-4 py-3 text-sm" style={{ background: '#2a1212', border: '1px solid #F44336', color: '#F44336' }}>
          {editError}
        </div>
      )}

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
                      {['OP', 'Produto', 'Funcionário', 'Máquina', 'Produzido', 'Refugo', 'Retrabalho', 'Efic.', 'Turno', 'Início', 'Fim', 'Ações'].map((h, i) => (
                        <th key={h}
                          className={`px-4 py-3 font-bold text-xs tracking-widest uppercase ${i >= 4 && i <= 7 ? 'text-right' : 'text-left'}`}
                          style={{ color: '#888888', fontFamily: 'Barlow Condensed, sans-serif', whiteSpace: 'nowrap', ...(h === 'Ações' ? { position: 'sticky', right: 0, background: '#222222', boxShadow: '-2px 0 8px rgba(0,0,0,0.5)' } : {}) }}>
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

                      if (editingId === a.id) {
                        return (
                          <tr key={a.id} style={{ borderBottom: '1px solid #2A2A2A', background: '#1A1A2A' }}>
                            <td className="px-4 py-2 font-medium whitespace-nowrap" style={{ color: '#F5A623', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>
                              {a.ordens_producao?.numero}
                            </td>
                            <td className="px-4 py-2" style={{ color: '#888888', fontSize: '12px' }}>
                              {a.produtos?.codigo}
                            </td>
                            <td className="px-4 py-2" style={{ color: '#888888', fontSize: '12px' }}>
                              {a.funcionarios?.nome}
                            </td>
                            <td className="px-4 py-2" style={{ color: '#888888', fontSize: '12px' }}>
                              {a.maquinas?.codigo}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input type="number" min="0" step="0.001" value={editValues.quantidade_produzida}
                                onChange={e => setEditValues(v => ({ ...v, quantidade_produzida: e.target.value }))}
                                style={{ ...inputStyle, width: '80px', textAlign: 'right' }} />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input type="number" min="0" step="0.001" value={editValues.quantidade_refugo}
                                onChange={e => setEditValues(v => ({ ...v, quantidade_refugo: e.target.value }))}
                                style={{ ...inputStyle, width: '70px', textAlign: 'right' }} />
                            </td>
                            <td className="px-4 py-2 text-right">
                              <input type="number" min="0" step="0.001" value={editValues.quantidade_retrabalho}
                                onChange={e => setEditValues(v => ({ ...v, quantidade_retrabalho: e.target.value }))}
                                style={{ ...inputStyle, width: '70px', textAlign: 'right' }} />
                            </td>
                            <td className="px-4 py-2 text-right" style={{ color: '#888888', fontSize: '12px' }}>—</td>
                            <td className="px-4 py-2">
                              <select value={editValues.turno} onChange={e => setEditValues(v => ({ ...v, turno: e.target.value }))}
                                style={{ ...inputStyle, width: '90px' }}>
                                <option value="MANHA">Manhã</option>
                                <option value="TARDE">Tarde</option>
                                <option value="NOITE">Noite</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input type="datetime-local" value={editValues.data_inicio}
                                onChange={e => setEditValues(v => ({ ...v, data_inicio: e.target.value }))}
                                style={{ ...inputStyle, colorScheme: 'dark', width: '160px' }} />
                            </td>
                            <td className="px-4 py-2">
                              <input type="datetime-local" value={editValues.data_fim}
                                onChange={e => setEditValues(v => ({ ...v, data_fim: e.target.value }))}
                                style={{ ...inputStyle, colorScheme: 'dark', width: '160px' }} />
                            </td>
                            <td className="px-4 py-2" style={{ position: 'sticky', right: 0, background: '#1A1A2A', boxShadow: '-2px 0 8px rgba(0,0,0,0.5)' }}>
                              <div className="flex gap-2">
                                <button onClick={() => saveEdit(a.id)} disabled={editSaving}
                                  className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80 disabled:opacity-50"
                                  style={{ background: '#4CAF50', color: '#111', whiteSpace: 'nowrap' }}>
                                  <Check className="h-3 w-3" /> Salvar
                                </button>
                                <button onClick={cancelEdit}
                                  className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80"
                                  style={{ background: '#2A2A2A', color: '#F5F5F5' }}>
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      }

                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid #1C1C1C' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#222222')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                          <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: '#F5A623', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>
                            {a.ordens_producao?.numero}
                          </td>
                          <td className="px-4 py-3" style={{ color: '#F5F5F5' }}>
                            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{a.produtos?.codigo}</div>
                            <div className="truncate max-w-[140px]" style={{ fontSize: '11px', color: '#888888' }}>{a.produtos?.descricao}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#F5F5F5', fontSize: '13px' }}>{a.funcionarios?.nome}</td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#F5F5F5', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px' }}>{a.maquinas?.codigo}</td>
                          <td className="px-4 py-3 text-right" style={{ color: '#4CAF50', fontFamily: 'IBM Plex Mono, monospace', fontSize: '13px' }}>
                            {formatNumber(prod)}
                            <span style={{ fontSize: '10px', color: '#888888', marginLeft: '4px' }}>{a.produtos?.unidade_medida}</span>
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
                            <Badge variant={turnoVariant[a.turno as TurnoEnum]}>{turnoLabel[a.turno as TurnoEnum]}</Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#888888', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px' }}>
                            {formatDateTime(a.data_inicio)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#888888', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px' }}>
                            {formatDateTime(a.data_fim)}
                          </td>
                          <td className="px-4 py-3" style={{ position: 'sticky', right: 0, background: '#1C1C1C', boxShadow: '-2px 0 8px rgba(0,0,0,0.5)' }}>
                            <div className="flex gap-2">
                              <button onClick={() => startEdit(a)}
                                className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80"
                                style={{ background: '#1A2A3A', border: '1px solid #2A4A6A', color: '#4A9EDF', whiteSpace: 'nowrap' }}>
                                <Pencil className="h-3 w-3" /> Editar
                              </button>
                              <button onClick={() => handleDelete(a.id)}
                                className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80"
                                style={{ background: '#2a1212', border: '1px solid #F4433666', color: '#F44336' }}>
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
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
