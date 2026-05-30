'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Package, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ codigo: string; descricao: string; unidade_medida: string }>({ codigo: '', descricao: '', unidade_medida: '' })
  const [editSaving, setEditSaving] = useState(false)

  const fetchProdutos = () => {
    const supabase = createClient()
    supabase
      .from('produtos')
      .select('id, codigo, descricao, unidade_medida, created_at')
      .order('codigo')
      .then(({ data }) => {
        setProdutos(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchProdutos()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('produtos') as any).insert({
      codigo: formData.get('codigo') as string,
      descricao: formData.get('descricao') as string,
      unidade_medida: (formData.get('unidade_medida') as string) || 'UN',
    })
    if (dbError) {
      setError(dbError.message)
    } else {
      setSuccess(true)
      formRef.current?.reset()
      fetchProdutos()
      setTimeout(() => setSuccess(false), 3000)
    }
    setSubmitting(false)
  }

  const startEdit = (p: any) => {
    setEditingId(p.id)
    setEditValues({ codigo: p.codigo, descricao: p.descricao, unidade_medida: p.unidade_medida })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (id: string) => {
    setEditSaving(true)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('produtos') as any)
      .update({ codigo: editValues.codigo, descricao: editValues.descricao, unidade_medida: editValues.unidade_medida })
      .eq('id', id)
    if (dbError) {
      setError(dbError.message)
    } else {
      setEditingId(null)
      fetchProdutos()
    }
    setEditSaving(false)
  }

  const handleDelete = async (id: string, codigo: string) => {
    if (!window.confirm(`Excluir o produto "${codigo}"? Esta ação não pode ser desfeita.`)) return
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('produtos') as any).delete().eq('id', id)
    if (dbError) {
      setError(dbError.message)
    } else {
      fetchProdutos()
    }
  }

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  const inputStyle = { background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-wide"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}
          >
            PRODUTOS
          </h1>
          <p className="text-sm mt-1" style={{ color: '#888888' }}>
            {produtos.length} {produtos.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
          </p>
        </div>
        <Package style={{ color: '#F5A623' }} className="h-8 w-8" />
      </div>

      {error && (
        <div className="rounded px-4 py-3 text-sm" style={{ background: '#2a1212', border: '1px solid #F44336', color: '#F44336' }}>
          Erro: {error}
        </div>
      )}
      {success && (
        <div className="rounded px-4 py-3 text-sm" style={{ background: '#122a12', border: '1px solid #4CAF50', color: '#4CAF50' }}>
          Produto salvo com sucesso!
        </div>
      )}

      {/* Create Form */}
      <div className="rounded-lg p-6" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5A623' }}
        >
          <Plus className="h-5 w-5" />
          NOVO PRODUTO
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Código *</label>
            <input name="codigo" required className="rounded px-3 py-2 text-sm outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Descrição *</label>
            <input name="descricao" required className="rounded px-3 py-2 text-sm outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Unidade de Medida</label>
            <input name="unidade_medida" placeholder="UN" className="rounded px-3 py-2 text-sm outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button type="submit" disabled={submitting} className="rounded px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: '#F5A623', color: '#111111' }}>
              {submitting ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #2A2A2A' }}>
          <h2 className="text-base font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}>LISTA DE PRODUTOS</h2>
        </div>
        {produtos.length === 0 ? (
          <div className="py-12 text-center" style={{ color: '#888888' }}>
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum produto cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2A2A2A', background: '#222222' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Unidade</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < produtos.length - 1 ? '1px solid #2A2A2A' : undefined }}>
                    {editingId === p.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input value={editValues.codigo} onChange={e => setEditValues(v => ({ ...v, codigo: e.target.value }))}
                            className="rounded px-2 py-1 text-sm w-full outline-none" style={inputStyle} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editValues.descricao} onChange={e => setEditValues(v => ({ ...v, descricao: e.target.value }))}
                            className="rounded px-2 py-1 text-sm w-full outline-none" style={inputStyle} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editValues.unidade_medida} onChange={e => setEditValues(v => ({ ...v, unidade_medida: e.target.value }))}
                            className="rounded px-2 py-1 text-sm w-20 outline-none" style={inputStyle} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => saveEdit(p.id)} disabled={editSaving}
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
                        <td className="px-4 py-3 font-mono font-medium" style={{ color: '#F5A623' }}>{p.codigo}</td>
                        <td className="px-4 py-3" style={{ color: '#F5F5F5' }}>{p.descricao}</td>
                        <td className="px-4 py-3" style={{ color: '#888888' }}>{p.unidade_medida}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => startEdit(p)}
                              className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80"
                              style={{ background: '#1A2A3A', border: '1px solid #2A4A6A', color: '#4A9EDF' }}>
                              <Pencil className="h-3 w-3" /> Editar
                            </button>
                            <button onClick={() => handleDelete(p.id, p.codigo)}
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
