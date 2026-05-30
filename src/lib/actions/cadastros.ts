'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProduto(formData: FormData) {
  const supabase = await createClient()
  if (!supabase) redirect('/cadastros/produtos?erro=sem-conexao')

  const codigo = String(formData.get('codigo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const unidade_medida = String(formData.get('unidade_medida') ?? 'UN').trim()

  if (!codigo || !descricao) redirect('/cadastros/produtos?erro=campos-obrigatorios')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('produtos') as any).insert({ codigo, descricao, unidade_medida })
  if (error) redirect(`/cadastros/produtos?erro=${encodeURIComponent(error.message)}`)

  revalidatePath('/cadastros/produtos')
  redirect('/cadastros/produtos?ok=1')
}

export async function createFuncionario(formData: FormData) {
  const supabase = await createClient()
  if (!supabase) redirect('/cadastros/funcionarios?erro=sem-conexao')

  const matricula = String(formData.get('matricula') ?? '').trim()
  const nome = String(formData.get('nome') ?? '').trim()
  const setor = String(formData.get('setor') ?? '').trim()

  if (!matricula || !nome || !setor) redirect('/cadastros/funcionarios?erro=campos-obrigatorios')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('funcionarios') as any).insert({ matricula, nome, setor })
  if (error) redirect(`/cadastros/funcionarios?erro=${encodeURIComponent(error.message)}`)

  revalidatePath('/cadastros/funcionarios')
  redirect('/cadastros/funcionarios?ok=1')
}

export async function createMaquina(formData: FormData) {
  const supabase = await createClient()
  if (!supabase) redirect('/cadastros/maquinas?erro=sem-conexao')

  const codigo = String(formData.get('codigo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const setor = String(formData.get('setor') ?? '').trim()

  if (!codigo || !descricao || !setor) redirect('/cadastros/maquinas?erro=campos-obrigatorios')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('maquinas') as any).insert({ codigo, descricao, setor })
  if (error) redirect(`/cadastros/maquinas?erro=${encodeURIComponent(error.message)}`)

  revalidatePath('/cadastros/maquinas')
  redirect('/cadastros/maquinas?ok=1')
}

export async function createOrdem(formData: FormData) {
  const supabase = await createClient()
  if (!supabase) redirect('/cadastros/ordens?erro=sem-conexao')

  const numero = String(formData.get('numero') ?? '').trim()
  const produto_id = String(formData.get('produto_id') ?? '').trim()
  const quantidade_planejada = Number(formData.get('quantidade_planejada'))
  const data_prevista = String(formData.get('data_prevista') ?? '').trim()
  const status = String(formData.get('status') ?? 'ABERTA').trim()

  if (!numero || !produto_id || !quantidade_planejada || !data_prevista) {
    redirect('/cadastros/ordens?erro=campos-obrigatorios')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('ordens_producao') as any).insert({
    numero,
    produto_id,
    quantidade_planejada,
    data_prevista,
    status,
  })
  if (error) redirect(`/cadastros/ordens?erro=${encodeURIComponent(error.message)}`)

  revalidatePath('/cadastros/ordens')
  redirect('/cadastros/ordens?ok=1')
}
