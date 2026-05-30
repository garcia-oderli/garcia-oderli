'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createProduto(formData: FormData) {
  const supabase = await createClient()

  const codigo = String(formData.get('codigo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const unidade_medida = String(formData.get('unidade_medida') ?? 'UN').trim()

  if (!codigo || !descricao) throw new Error('Código e descrição são obrigatórios')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('produtos') as any).insert({ codigo, descricao, unidade_medida })
  if (error) throw new Error(`Erro ao salvar produto: ${error.message}`)

  revalidatePath('/cadastros/produtos')
  redirect('/cadastros/produtos')
}

export async function createFuncionario(formData: FormData) {
  const supabase = await createClient()

  const matricula = String(formData.get('matricula') ?? '').trim()
  const nome = String(formData.get('nome') ?? '').trim()
  const setor = String(formData.get('setor') ?? '').trim()

  if (!matricula || !nome || !setor) throw new Error('Todos os campos são obrigatórios')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('funcionarios') as any).insert({ matricula, nome, setor })
  if (error) throw new Error(`Erro ao salvar funcionário: ${error.message}`)

  revalidatePath('/cadastros/funcionarios')
  redirect('/cadastros/funcionarios')
}

export async function createMaquina(formData: FormData) {
  const supabase = await createClient()

  const codigo = String(formData.get('codigo') ?? '').trim()
  const descricao = String(formData.get('descricao') ?? '').trim()
  const setor = String(formData.get('setor') ?? '').trim()

  if (!codigo || !descricao || !setor) throw new Error('Todos os campos são obrigatórios')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('maquinas') as any).insert({ codigo, descricao, setor })
  if (error) throw new Error(`Erro ao salvar máquina: ${error.message}`)

  revalidatePath('/cadastros/maquinas')
  redirect('/cadastros/maquinas')
}

export async function createOrdem(formData: FormData) {
  const supabase = await createClient()

  const numero = String(formData.get('numero') ?? '').trim()
  const produto_id = String(formData.get('produto_id') ?? '').trim()
  const quantidade_planejada = Number(formData.get('quantidade_planejada'))
  const data_prevista = String(formData.get('data_prevista') ?? '').trim()
  const status = String(formData.get('status') ?? 'ABERTA').trim()

  if (!numero || !produto_id || !quantidade_planejada || !data_prevista) {
    throw new Error('Todos os campos são obrigatórios')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('ordens_producao') as any).insert({
    numero,
    produto_id,
    quantidade_planejada,
    data_prevista,
    status,
  })
  if (error) throw new Error(`Erro ao salvar ordem: ${error.message}`)

  revalidatePath('/cadastros/ordens')
  redirect('/cadastros/ordens')
}
