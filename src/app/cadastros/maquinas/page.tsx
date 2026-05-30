import { createClient } from '@/lib/supabase/server'
import { createMaquina } from '@/lib/actions/cadastros'
import { Settings, Plus } from 'lucide-react'

export const metadata = {
  title: 'Máquinas — Apontamento de Produção',
}

export default async function MaquinasPage() {
  const supabase = await createClient()
  let maquinas: any[] = []

  try {
    const { data } = await (supabase.from('maquinas') as any)
      .select('id, codigo, descricao, setor, created_at')
      .order('codigo')
    maquinas = data ?? []
  } catch {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-wide"
            style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#F5F5F5' }}
          >
            MÁQUINAS
          </h1>
          <p className="text-sm mt-1" style={{ color: '#888888' }}>
            {maquinas.length} {maquinas.length === 1 ? 'máquina cadastrada' : 'máquinas cadastradas'}
          </p>
        </div>
        <Settings style={{ color: '#F5A623' }} className="h-8 w-8" />
      </div>

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
          NOVA MÁQUINA
        </h2>
        <form action={createMaquina} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Código *
            </label>
            <input
              name="codigo"
              required
              className="rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Descrição *
            </label>
            <input
              name="descricao"
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
              className="rounded px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#F5A623', color: '#111111' }}
            >
              Salvar Máquina
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
            LISTA DE MÁQUINAS
          </h2>
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
                </tr>
              </thead>
              <tbody>
                {maquinas.map((m, i) => (
                  <tr
                    key={m.id}
                    style={{ borderBottom: i < maquinas.length - 1 ? '1px solid #2A2A2A' : undefined }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <td className="px-4 py-3 font-mono font-medium" style={{ color: '#F5A623' }}>{m.codigo}</td>
                    <td className="px-4 py-3" style={{ color: '#F5F5F5' }}>{m.descricao}</td>
                    <td className="px-4 py-3" style={{ color: '#888888' }}>{m.setor}</td>
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
