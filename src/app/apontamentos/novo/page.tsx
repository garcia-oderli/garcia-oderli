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
          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#888888', textDecoration: 'none' }}
        >
          <ChevronLeft className="h-4 w-4" />
          Apontamentos
        </Link>
        <span style={{ color: '#3A3A3A' }}>/</span>
        <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 600 }}>Novo</span>
      </div>

      <div>
        <h1 style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontWeight: 700,
          fontSize: '28px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: '#F5F5F5',
          margin: 0,
        }}>Novo Apontamento</h1>
        <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
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
