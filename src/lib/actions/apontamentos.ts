'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TurnoEnum } from '@/types/database'

export interface NovoApontamentoData {
  ordem_producao_id: string
  produto_id: string
  funcionario_id: string
  maquina_id: string
  quantidade_produzida: number
  quantidade_refugo: number
  quantidade_retrabalho: number
  data_inicio: string
  data_fim: string
  turno: TurnoEnum
  observacoes?: string
}

export async function criarApontamento(data: NovoApontamentoData) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('apontamentos') as any).insert({
    ...data,
    quantidade_refugo: data.quantidade_refugo ?? 0,
    quantidade_retrabalho: data.quantidade_retrabalho ?? 0,
  })

  if (error) {
    throw new Error(`Erro ao salvar apontamento: ${error.message}`)
  }

  revalidatePath('/')
  revalidatePath('/apontamentos')
  redirect('/apontamentos')
}

export async function buscarDadosFormulario() {
  const supabase = await createClient()

  const [ordensRes, funcionariosRes, maquinasRes] = await Promise.all([
    supabase
      .from('ordens_producao')
      .select('id, numero, quantidade_planejada, data_prevista, status, produtos(codigo, descricao, unidade_medida)')
      .in('status', ['ABERTA', 'EM_ANDAMENTO'])
      .order('numero'),
    supabase.from('funcionarios').select('id, matricula, nome, setor').order('nome'),
    supabase.from('maquinas').select('id, codigo, descricao, setor').order('codigo'),
  ])

  return {
    ordens: ordensRes.data ?? [],
    funcionarios: funcionariosRes.data ?? [],
    maquinas: maquinasRes.data ?? [],
  }
}
