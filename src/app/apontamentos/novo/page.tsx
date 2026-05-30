'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NovoApontamentoForm } from '@/components/novo-apontamento-form'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function NovoApontamentoPage() {
  const [ordens, setOrdens] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [maquinas, setMaquinas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('ordens_producao')
        .select('id, numero, quantidade_planejada, data_prevista, status, produtos(codigo, descricao, unidade_medida)')
        .in('status', ['ABERTA', 'EM_ANDAMENTO'])
        .order('numero'),
      supabase.from('funcionarios').select('id, matricula, nome, setor').order('nome'),
      supabase.from('maquinas').select('id, codigo, descricao, setor').order('codigo'),
    ]).then(([o, f, m]) => {
      setOrdens(o.data ?? [])
      setFuncionarios(f.data ?? [])
      setMaquinas(m.data ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

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
        ordens={ordens as Parameters<typeof NovoApontamentoForm>[0]['ordens']}
        funcionarios={funcionarios}
        maquinas={maquinas}
      />
    </div>
  )
}
