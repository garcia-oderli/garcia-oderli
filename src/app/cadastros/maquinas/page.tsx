'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Plus, Pencil, Trash2, Check, X, QrCode } from 'lucide-react'
import Link from 'next/link'

export default function MaquinasPage() {
  const [maquinas, setMaquinas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ codigo: string; descricao: string; setor: string }>({ codigo: '', descricao: '', setor: '' })
  const [editSaving, setEditSaving] = useState(false)

  const fetchMaquinas = () => {
    const supabase = createClient()
    supabase
      .from('maquinas')
      .select('id, codigo, descricao, setor, created_at')
      .order('codigo')
      .then(({ data }) => {
        setMaquinas(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchMaquinas()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('maquinas') as any).insert({
      codigo: formData.get('codigo') as string,
      descricao: formData.get('descricao') as string,
      setor: formData.get('setor') as string,
    })
    if (dbError) {
      setError(dbError.message)
    } else {
      setSuccess(true)
      formRef.current?.reset()
      fetchMaquinas()
      setTimeout(() => setSuccess(false), 3000)
    }
    setSubmitting(false)
  }

  const startEdit = (m: any) => {
    setEditingId(m.id)
    setEditValues({ codigo: m.codigo, descricao: m.descricao, setor: m.setor })
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (id: string) => {
    setEditSaving(true)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('maquinas') as any)
      .update({ codigo: editValues.codigo, descricao: editValues.descricao, setor: editValues.setor })
      .eq('id', id)
    if (dbError) {
      setError(dbError.message)
    } else {
      setEditingId(null)
      fetchMaquinas()
    }
    setEditSaving(false)
  }

  const handleDelete = async (id: string, codigo: string) => {
    if (!window.confirm(`Excluir a máquina "${codigo}"? Esta ação não pode ser desfeita.`)) return
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('maquinas') as any).delete().eq('id', id)
    if (dbError) {
      setError(dbError.message)
    } else {
      fetchMaquinas()
    }
  }

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  const inputStyle = { background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}>
            MÁQUINAS
          </h1>
          <p className="text-sm mt-1" style={{ color: '#888888' }}>
            {maquinas.length} {maquinas.length === 1 ? 'máquina cadastrada' : 'máquinas cadastradas'}
          </p>
        </div>
        <Settings style={{ color: '#F5A623' }} className="h-8 w-8" />
      </div>

      {error && (
        <div className="rounded px-4 py-3 text-sm" style={{ background: '#2a1212', border: '1px solid #F44336', color: '#F44336' }}>
          Erro: {error}
        </div>
      )}
      {success && (
        <div className="rounded px-4 py-3 text-sm" style={{ background: '#122a12', border: '1px solid #4CAF50', color: '#4CAF50' }}>
          Máquina salva com sucesso!
        </div>
      )}

      {/* Create Form */}
      <div className="rounded-lg p-6" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5A623' }}>
          <Plus className="h-5 w-5" />
          NOVA MÁQUINA
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Código *</label>
            <input name="codigo" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Descrição *</label>
            <input name="descricao" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Setor *</label>
            <input name="setor" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button type="submit" disabled={submitting} className="rounded px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: '#F5A623', color: '#111111' }}>
              {submitting ? 'Salvando...' : 'Salvar Máquina'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #2A2A2A' }}>
          <h2 className="text-base font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}>LISTA DE MÁQUINAS</h2>
          <Link href="/cadastros/maquinas/qr"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#F5A623', textDecoration: 'none', border: '1px solid #F5A62366', borderRadius: '4px', padding: '4px 10px' }}>
            <QrCode size={13} /> Imprimir QR Codes
          </Link>
        </div>
        {maquinas.length === 0 ? (
          <div className="py-12 text-center" style={{ color: '#888888' }}>
            <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma máquina cadastrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2A2A2A', background: '#222222' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Setor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {maquinas.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: i < maquinas.length - 1 ? '1px solid #2A2A2A' : undefined }}>
                    {editingId === m.id ? (
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
                          <input value={editValues.setor} onChange={e => setEditValues(v => ({ ...v, setor: e.target.value }))}
                            className="rounded px-2 py-1 text-sm w-full outline-none" style={inputStyle} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => saveEdit(m.id)} disabled={editSaving}
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
                        <td className="px-4 py-3 font-mono font-medium" style={{ color: '#F5A623' }}>{m.codigo}</td>
                        <td className="px-4 py-3" style={{ color: '#F5F5F5' }}>{m.descricao}</td>
                        <td className="px-4 py-3" style={{ color: '#888888' }}>{m.setor}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => startEdit(m)}
                              className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80"
                              style={{ background: '#1A2A3A', border: '1px solid #2A4A6A', color: '#4A9EDF' }}>
                              <Pencil className="h-3 w-3" /> Editar
                            </button>
                            <button onClick={() => handleDelete(m.id, m.codigo)}
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
