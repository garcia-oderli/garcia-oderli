import { createClient } from '@/lib/supabase/server'
import { NovoApontamentoForm } from '@/components/novo-apontamento-form'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Novo Apontamento — Apontamento de Produção v1',
}

export default async function NovoApontamentoPage() {
  const supabase = await createClient()

  let ordensRes: { data: any[] | null } = { data: null }
  let funcionariosRes: { data: any[] | null } = { data: null }
  let maquinasRes: { data: any[] | null } = { data: null }

  if (supabase) {
    try {
      const [o, f, m] = await Promise.all([
        supabase
          .from('ordens_producao')
          .select(
            'id, numero, quantidade_planejada, data_prevista, status, produtos(codigo, descricao, unidade_medida)'
          )
          .in('status', ['ABERTA', 'EM_ANDAMENTO'])
          .order('numero'),
        supabase.from('funcionarios').select('id, matricula, nome, setor').order('nome'),
        supabase.from('maquinas').select('id, codigo, descricao, setor').order('codigo'),
      ])
      ordensRes = o
      funcionariosRes = f
      maquinasRes = m
    } catch {}
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/apontamentos"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Apontamentos
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">Novo</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Apontamento</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registre a produção realizada em uma ordem de produção.
        </p>
      </div>

      <NovoApontamentoForm
        ordens={(ordensRes.data ?? []) as Parameters<typeof NovoApontamentoForm>[0]['ordens']}
        funcionarios={funcionariosRes.data ?? []}
        maquinas={maquinasRes.data ?? []}
      />
    </div>
  )
}
