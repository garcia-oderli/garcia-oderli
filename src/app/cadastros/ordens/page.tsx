'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClipboardList, Plus, Pencil, Trash2, Check, X, Lock } from 'lucide-react'
import type { StatusOrdem } from '@/types/database'

const statusColors: Record<StatusOrdem, string> = {
  ABERTA: '#4CAF50',
  EM_ANDAMENTO: '#F5A623',
  CONCLUIDA: '#888888',
  CANCELADA: '#F44336',
}

const statusLabels: Record<StatusOrdem, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('pt-BR')
}

export default function OrdensPage() {
  const [ordens, setOrdens] = useState<any[]>([])
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ numero: string; produto_id: string; quantidade_planejada: string; data_prevista: string; status: string }>({
    numero: '', produto_id: '', quantidade_planejada: '', data_prevista: '', status: 'ABERTA'
  })
  const [editSaving, setEditSaving] = useState(false)

  const fetchData = () => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('ordens_producao')
        .select('id, numero, quantidade_planejada, data_prevista, status, created_at, produtos(codigo, descricao)')
        .order('numero'),
      supabase.from('produtos').select('id, codigo, descricao').order('codigo'),
    ]).then(([ordensRes, produtosRes]) => {
      setOrdens(ordensRes.data ?? [])
      setProdutos(produtosRes.data ?? [])
      setLoading(false)
    })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('ordens_producao') as any).insert({
      numero: formData.get('numero') as string,
      produto_id: formData.get('produto_id') as string,
      quantidade_planejada: Number(formData.get('quantidade_planejada')),
      data_prevista: formData.get('data_prevista') as string,
      status: (formData.get('status') as string) || 'ABERTA',
    })
    if (dbError) {
      setError(dbError.message)
    } else {
      setSuccess(true)
      formRef.current?.reset()
      fetchData()
      setTimeout(() => setSuccess(false), 3000)
    }
    setSubmitting(false)
  }

  const startEdit = (o: any) => {
    setEditingId(o.id)
    setEditValues({
      numero: o.numero,
      produto_id: o.produto_id ?? '',
      quantidade_planejada: String(o.quantidade_planejada),
      data_prevista: o.data_prevista,
      status: o.status,
    })
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (id: string) => {
    setEditSaving(true)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('ordens_producao') as any)
      .update({
        numero: editValues.numero,
        produto_id: editValues.produto_id,
        quantidade_planejada: Number(editValues.quantidade_planejada),
        data_prevista: editValues.data_prevista,
        status: editValues.status,
      })
      .eq('id', id)
    if (dbError) {
      setError(dbError.message)
    } else {
      setEditingId(null)
      fetchData()
    }
    setEditSaving(false)
  }

  const handleDelete = async (id: string, numero: string) => {
    if (!window.confirm(`Excluir a ordem "${numero}"? Esta ação não pode ser desfeita.`)) return
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('ordens_producao') as any).delete().eq('id', id)
    if (dbError) {
      setError(dbError.message)
    } else {
      fetchData()
    }
  }

  const handleFecharOP = async (id: string, numero: string) => {
    if (!window.confirm(`Fechar a Ordem de Produção "${numero}"? O status será alterado para Concluída.`)) return
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('ordens_producao') as any)
      .update({ status: 'CONCLUIDA' })
      .eq('id', id)
    if (dbError) {
      setError(dbError.message)
    } else {
      fetchData()
    }
  }

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  const inputStyle = { background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}>
            ORDENS DE PRODUÇÃO
          </h1>
          <p className="text-sm mt-1" style={{ color: '#888888' }}>
            {ordens.length} {ordens.length === 1 ? 'ordem cadastrada' : 'ordens cadastradas'}
          </p>
        </div>
        <ClipboardList style={{ color: '#F5A623' }} className="h-8 w-8" />
      </div>

      {error && (
        <div className="rounded px-4 py-3 text-sm" style={{ background: '#2a1212', border: '1px solid #F44336', color: '#F44336' }}>
          Erro: {error}
        </div>
      )}
      {success && (
        <div className="rounded px-4 py-3 text-sm" style={{ background: '#122a12', border: '1px solid #4CAF50', color: '#4CAF50' }}>
          Ordem salva com sucesso!
        </div>
      )}

      {/* Create Form */}
      <div className="rounded-lg p-6" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5A623' }}>
          <Plus className="h-5 w-5" />
          NOVA ORDEM DE PRODUÇÃO
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Número *</label>
            <input name="numero" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Produto *</label>
            <select name="produto_id" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle}>
              <option value="">Selecione...</option>
              {produtos.map((p: any) => (
                <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Quantidade Planejada *</label>
            <input name="quantidade_planejada" type="number" min="1" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Data Prevista *</label>
            <input name="data_prevista" type="date" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Status</label>
            <select name="status" className="rounded px-3 py-2 text-sm outline-none" style={inputStyle}>
              <option value="ABERTA">Aberta</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className="w-full rounded px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: '#F5A623', color: '#111111' }}>
              {submitting ? 'Salvando...' : 'Salvar Ordem'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #2A2A2A' }}>
          <h2 className="text-base font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}>LISTA DE ORDENS</h2>
        </div>
        {ordens.length === 0 ? (
          <div className="py-12 text-center" style={{ color: '#888888' }}>
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma ordem de produção cadastrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2A2A2A', background: '#222222' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Produto</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Qtd. Planejada</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Data Prevista</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {ordens.map((o: any, i: number) => (
                  <tr key={o.id} style={{ borderBottom: i < ordens.length - 1 ? '1px solid #2A2A2A' : undefined }}>
                    {editingId === o.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input value={editValues.numero} onChange={e => setEditValues(v => ({ ...v, numero: e.target.value }))}
                            className="rounded px-2 py-1 text-sm w-24 outline-none" style={inputStyle} />
                        </td>
                        <td className="px-4 py-2">
                          <select value={editValues.produto_id} onChange={e => setEditValues(v => ({ ...v, produto_id: e.target.value }))}
                            className="rounded px-2 py-1 text-sm outline-none" style={inputStyle}>
                            {produtos.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input type="number" min="1" value={editValues.quantidade_planejada} onChange={e => setEditValues(v => ({ ...v, quantidade_planejada: e.target.value }))}
                            className="rounded px-2 py-1 text-sm w-24 outline-none text-right" style={inputStyle} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="date" value={editValues.data_prevista} onChange={e => setEditValues(v => ({ ...v, data_prevista: e.target.value }))}
                            className="rounded px-2 py-1 text-sm outline-none" style={{ ...inputStyle, colorScheme: 'dark' }} />
                        </td>
                        <td className="px-4 py-2">
                          <select value={editValues.status} onChange={e => setEditValues(v => ({ ...v, status: e.target.value }))}
                            className="rounded px-2 py-1 text-sm outline-none" style={inputStyle}>
                            <option value="ABERTA">Aberta</option>
                            <option value="EM_ANDAMENTO">Em Andamento</option>
                            <option value="CONCLUIDA">Concluída</option>
                            <option value="CANCELADA">Cancelada</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => saveEdit(o.id)} disabled={editSaving}
                              className="rounded px-2 py-1 text-xs font-semibold flex items-center gap-1 hover:opacity-80 disabled:opacity-50"
                              style={{ background: '#4CAF50', color: '#111' }}>
                              <Check className="h-3 w-3" /> Salvar
                            </button>
                            <button onClick={cancelEdit}
                              className="rounded px-2 py-1 text-xs font-semibold flex items-center gap-1 hover:opacity-80"
                              style={{ background: '#2A2A2A', color: '#F5F5F5' }}>
                              <X className="h-3 w-3" /> Cancelar
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-mono font-medium" style={{ color: '#F5A623' }}>{o.numero}</td>
                        <td className="px-4 py-3" style={{ color: '#F5F5F5' }}>
                          <div className="font-medium">{o.produtos?.codigo}</div>
                          <div className="text-xs" style={{ color: '#888888' }}>{o.produtos?.descricao}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono" style={{ color: '#F5F5F5' }}>
                          {Number(o.quantidade_planejada).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3" style={{ color: '#888888' }}>{formatDate(o.data_prevista)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded px-2 py-0.5 text-xs font-semibold" style={{
                            background: `${statusColors[o.status as StatusOrdem]}22`,
                            color: statusColors[o.status as StatusOrdem],
                            border: `1px solid ${statusColors[o.status as StatusOrdem]}44`,
                          }}>
                            {statusLabels[o.status as StatusOrdem]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2 flex-wrap">
                            {(o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO') && (
                              <button onClick={() => handleFecharOP(o.id, o.numero)}
                                className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80"
                                style={{ background: '#12221A', border: '1px solid #4CAF5066', color: '#4CAF50' }}>
                                <Lock className="h-3 w-3" /> Fechar OP
                              </button>
                            )}
                            <button onClick={() => startEdit(o)}
                              className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80"
                              style={{ background: '#1A2A3A', border: '1px solid #2A4A6A', color: '#4A9EDF' }}>
                              <Pencil className="h-3 w-3" /> Editar
                            </button>
                            <button onClick={() => handleDelete(o.id, o.numero)}
                              className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80"
                              style={{ background: '#2a1212', border: '1px solid #F4433666', color: '#F44336' }}>
                              <Trash2 className="h-3 w-3" /> Excluir
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
