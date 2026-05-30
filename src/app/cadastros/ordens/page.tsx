import { createClient } from '@/lib/supabase/server'
import { createOrdem } from '@/lib/actions/cadastros'
import { ClipboardList, Plus } from 'lucide-react'
import type { StatusOrdem } from '@/types/database'

export const metadata = {
  title: 'Ordens de Produção — Apontamento de Produção',
}

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

export default async function OrdensPage() {
  const supabase = await createClient()
  let ordens: any[] = []
  let produtos: any[] = []

  try {
    const [ordensRes, produtosRes] = await Promise.all([
      (supabase.from('ordens_producao') as any)
        .select('id, numero, quantidade_planejada, data_prevista, status, created_at, produtos(codigo, descricao)')
        .order('numero'),
      (supabase.from('produtos') as any)
        .select('id, codigo, descricao')
        .order('codigo'),
    ])
    ordens = ordensRes.data ?? []
    produtos = produtosRes.data ?? []
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
            ORDENS DE PRODUÇÃO
          </h1>
          <p className="text-sm mt-1" style={{ color: '#888888' }}>
            {ordens.length} {ordens.length === 1 ? 'ordem cadastrada' : 'ordens cadastradas'}
          </p>
        </div>
        <ClipboardList style={{ color: '#F5A623' }} className="h-8 w-8" />
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
          NOVA ORDEM DE PRODUÇÃO
        </h2>
        <form action={createOrdem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Número *
            </label>
            <input
              name="numero"
              required
              className="rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Produto *
            </label>
            <select
              name="produto_id"
              required
              className="rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }}
            >
              <option value="">Selecione...</option>
              {produtos.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.descricao}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Quantidade Planejada *
            </label>
            <input
              name="quantidade_planejada"
              type="number"
              min="1"
              required
              className="rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Data Prevista *
            </label>
            <input
              name="data_prevista"
              type="date"
              required
              className="rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#888888' }}>
              Status
            </label>
            <select
              name="status"
              className="rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#111111', border: '1px solid #2A2A2A', color: '#F5F5F5' }}
            >
              <option value="ABERTA">Aberta</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#F5A623', color: '#111111' }}
            >
              Salvar Ordem
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
            LISTA DE ORDENS
          </h2>
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
                </tr>
              </thead>
              <tbody>
                {ordens.map((o: any, i: number) => (
                  <tr
                    key={o.id}
                    style={{ borderBottom: i < ordens.length - 1 ? '1px solid #2A2A2A' : undefined }}
                    className="hover:opacity-80 transition-opacity"
                  >
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
                      <span
                        className="rounded px-2 py-0.5 text-xs font-semibold"
                        style={{
                          background: `${statusColors[o.status as StatusOrdem]}22`,
                          color: statusColors[o.status as StatusOrdem],
                          border: `1px solid ${statusColors[o.status as StatusOrdem]}44`,
                        }}
                      >
                        {statusLabels[o.status as StatusOrdem]}
                      </span>
                    </td>
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
