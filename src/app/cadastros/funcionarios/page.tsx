'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus } from 'lucide-react'

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

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

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-wide"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}
          >
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
      <div
        className="rounded-lg p-6"
        style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}
      >
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5A623' }}
        >
          <Plus className="h-5 w-5" />
          NOVO FUNCIONÁRIO
        </h2>
        <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Matrícula *
            </label>
            <input
              name="matricula"
              required
              className="rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Nome *
            </label>
            <input
              name="nome"
              required
              className="rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Setor *
            </label>
            <input
              name="setor"
              required
              className="rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }}
            />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: '#F5A623', color: '#111111' }}
            >
              {submitting ? 'Salvando...' : 'Salvar Funcionário'}
            </button>
          </div>
        </form>
      </div>

      {/* List */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: '#1C1C1C', border: '1px solid #2A2A2A' }}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #2A2A2A' }}>
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}
          >
            LISTA DE FUNCIONÁRIOS
          </h2>
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
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f, i) => (
                  <tr
                    key={f.id}
                    style={{ borderBottom: i < funcionarios.length - 1 ? '1px solid #2A2A2A' : undefined }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <td className="px-4 py-3 font-mono font-medium" style={{ color: '#F5A623' }}>{f.matricula}</td>
                    <td className="px-4 py-3" style={{ color: '#F5F5F5' }}>{f.nome}</td>
                    <td className="px-4 py-3" style={{ color: '#888888' }}>{f.setor}</td>
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
