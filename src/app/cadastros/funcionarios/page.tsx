'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Pencil, Trash2, Check, X, QrCode } from 'lucide-react'
import Link from 'next/link'

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ matricula: string; nome: string; setor: string }>({ matricula: '', nome: '', setor: '' })
  const [editSaving, setEditSaving] = useState(false)

  const fetchFuncionarios = () => {
    const supabase = createClient()
    supabase
      .from('funcionarios')
      .select('id, matricula, nome, setor, created_at')
      .order('nome')
      .then(({ data }) => {
        setFuncionarios(data ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchFuncionarios()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('funcionarios') as any).insert({
      matricula: formData.get('matricula') as string,
      nome: formData.get('nome') as string,
      setor: formData.get('setor') as string,
    })
    if (dbError) {
      setError(dbError.message)
    } else {
      setSuccess(true)
      formRef.current?.reset()
      fetchFuncionarios()
      setTimeout(() => setSuccess(false), 3000)
    }
    setSubmitting(false)
  }

  const startEdit = (f: any) => {
    setEditingId(f.id)
    setEditValues({ matricula: f.matricula, nome: f.nome, setor: f.setor })
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async (id: string) => {
    setEditSaving(true)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('funcionarios') as any)
      .update({ matricula: editValues.matricula, nome: editValues.nome, setor: editValues.setor })
      .eq('id', id)
    if (dbError) {
      setError(dbError.message)
    } else {
      setEditingId(null)
      fetchFuncionarios()
    }
    setEditSaving(false)
  }

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Excluir o funcionário "${nome}"? Esta ação não pode ser desfeita.`)) return
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('funcionarios') as any).delete().eq('id', id)
    if (dbError) {
      setError(dbError.message)
    } else {
      fetchFuncionarios()
    }
  }

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  const inputStyle = { background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-wide" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}>
            FUNCIONÁRIOS
          </h1>
          <p className="text-sm mt-1" style={{ color: '#888888' }}>
            {funcionarios.length} {funcionarios.length === 1 ? 'funcionário cadastrado' : 'funcionários cadastrados'}
          </p>
        </div>
        <Users style={{ color: '#F5A623' }} className="h-8 w-8" />
      </div>

      {error && (
        <div className="rounded px-4 py-3 text-sm" style={{ background: '#2a1212', border: '1px solid #F44336', color: '#F44336' }}>
          Erro: {error}
        </div>
      )}
      {success && (
        <div className="rounded px-4 py-3 text-sm" style={{ background: '#122a12', border: '1px solid #4CAF50', color: '#4CAF50' }}>
          Funcionário salvo com sucesso!
        </div>
      )}

      {/* Create Form */}
      <div className="rounded-lg p-6" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5A623' }}>
          <Plus className="h-5 w-5" />
          NOVO FUNCIONÁRIO
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Matrícula *</label>
            <input name="matricula" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Nome *</label>
            <input name="nome" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Setor *</label>
            <input name="setor" required className="rounded px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button type="submit" disabled={submitting} className="rounded px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: '#F5A623', color: '#111111' }}>
              {submitting ? 'Salvando...' : 'Salvar Funcionário'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #2A2A2A' }}>
          <h2 className="text-base font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}>LISTA DE FUNCIONÁRIOS</h2>
          <Link href="/cadastros/funcionarios/qr"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#F5A623', textDecoration: 'none', border: '1px solid #F5A62366', borderRadius: '4px', padding: '4px 10px' }}>
            <QrCode size={13} /> Imprimir Crachás
          </Link>
        </div>
        {funcionarios.length === 0 ? (
          <div className="py-12 text-center" style={{ color: '#888888' }}>
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum funcionário cadastrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid #2A2A2A', background: '#222222' }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Matrícula</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Setor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f, i) => (
                  <tr key={f.id} style={{ borderBottom: i < funcionarios.length - 1 ? '1px solid #2A2A2A' : undefined }}>
                    {editingId === f.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input value={editValues.matricula} onChange={e => setEditValues(v => ({ ...v, matricula: e.target.value }))}
                            className="rounded px-2 py-1 text-sm w-full outline-none" style={inputStyle} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editValues.nome} onChange={e => setEditValues(v => ({ ...v, nome: e.target.value }))}
                            className="rounded px-2 py-1 text-sm w-full outline-none" style={inputStyle} />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editValues.setor} onChange={e => setEditValues(v => ({ ...v, setor: e.target.value }))}
                            className="rounded px-2 py-1 text-sm w-full outline-none" style={inputStyle} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => saveEdit(f.id)} disabled={editSaving}
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
                        <td className="px-4 py-3 font-mono font-medium" style={{ color: '#F5A623' }}>{f.matricula}</td>
                        <td className="px-4 py-3" style={{ color: '#F5F5F5' }}>{f.nome}</td>
                        <td className="px-4 py-3" style={{ color: '#888888' }}>{f.setor}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => startEdit(f)}
                              className="rounded px-2 py-1 text-xs flex items-center gap-1 hover:opacity-80"
                              style={{ background: '#1A2A3A', border: '1px solid #2A4A6A', color: '#4A9EDF' }}>
                              <Pencil className="h-3 w-3" /> Editar
                            </button>
                            <button onClick={() => handleDelete(f.id, f.nome)}
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
