'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import type { Funcionario, Maquina, TurnoEnum } from '@/types/database'

interface OrdemOption {
  id: string
  numero: string
  quantidade_planejada: number
  data_prevista: string
  status: string
  produtos: { codigo: string; descricao: string; unidade_medida: string } | null
}

interface Props {
  ordens: OrdemOption[]
  funcionarios: Funcionario[]
  maquinas: Maquina[]
}

const turnoOptions: { value: TurnoEnum; label: string }[] = [
  { value: 'MANHA', label: 'Manhã (06h - 14h)' },
  { value: 'TARDE', label: 'Tarde (14h - 22h)' },
  { value: 'NOITE', label: 'Noite (22h - 06h)' },
]

export function NovoApontamentoForm({ ordens, funcionarios, maquinas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [ordemId, setOrdemId] = useState('')
  const [funcionarioId, setFuncionarioId] = useState('')
  const [maquinaId, setMaquinaId] = useState('')
  const [turno, setTurno] = useState<TurnoEnum | ''>('')
  const [qtdProduzida, setQtdProduzida] = useState('')
  const [qtdRefugo, setQtdRefugo] = useState('0')
  const [qtdRetrabalho, setQtdRetrabalho] = useState('0')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [funcSearch, setFuncSearch] = useState('')

  const selectedOrdem = ordens.find((o) => o.id === ordemId)

  const filteredFuncionarios = funcionarios.filter(
    (f) =>
      funcSearch === '' ||
      f.nome.toLowerCase().includes(funcSearch.toLowerCase()) ||
      f.matricula.toLowerCase().includes(funcSearch.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!ordemId) return setError('Selecione a Ordem de Produção.')
    if (!funcionarioId) return setError('Selecione o Funcionário.')
    if (!maquinaId) return setError('Selecione a Máquina.')
    if (!turno) return setError('Selecione o Turno.')
    if (!qtdProduzida || Number(qtdProduzida) < 0)
      return setError('Informe a quantidade produzida (mínimo 0).')
    if (!dataInicio) return setError('Informe a data/hora de início.')
    if (!dataFim) return setError('Informe a data/hora de fim.')
    if (new Date(dataFim) <= new Date(dataInicio))
      return setError('A data/hora de fim deve ser posterior ao início.')

    const supabase = createClient()

    // Fetch the ordem to get produto_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ordem } = await (supabase.from('ordens_producao') as any)
      .select('produto_id')
      .eq('id', ordemId)
      .single()

    if (!ordem) return setError('Ordem de produção não encontrada.')

    startTransition(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: dbError } = await (supabase.from('apontamentos') as any).insert({
          ordem_producao_id: ordemId,
          produto_id: (ordem as { produto_id: string }).produto_id,
          funcionario_id: funcionarioId,
          maquina_id: maquinaId,
          quantidade_produzida: Number(qtdProduzida),
          quantidade_refugo: Number(qtdRefugo) || 0,
          quantidade_retrabalho: Number(qtdRetrabalho) || 0,
          data_inicio: new Date(dataInicio).toISOString(),
          data_fim: new Date(dataFim).toISOString(),
          turno: turno as TurnoEnum,
          observacoes: observacoes.trim() || null,
        })

        if (dbError) throw new Error((dbError as { message: string }).message)

        setSuccess(true)
        setTimeout(() => router.push('/apontamentos'), 1500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido.')
      }
    })
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold text-gray-900">Apontamento registrado com sucesso!</h2>
        <p className="text-gray-500">Redirecionando para a lista...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Ordem de Produção */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ordem de Produção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ordem">Ordem de Produção *</Label>
            <Select value={ordemId} onValueChange={setOrdemId}>
              <SelectTrigger id="ordem">
                <SelectValue placeholder="Selecione a OP..." />
              </SelectTrigger>
              <SelectContent>
                {ordens.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.numero} — {o.produtos?.descricao ?? ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedOrdem && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-md bg-blue-50 border border-blue-100 p-4">
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Produto</p>
                <p className="text-sm text-blue-900 font-semibold mt-1">
                  {selectedOrdem.produtos?.codigo}
                </p>
                <p className="text-xs text-blue-700">{selectedOrdem.produtos?.descricao}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  Qtd. Planejada
                </p>
                <p className="text-sm text-blue-900 font-semibold mt-1">
                  {Number(selectedOrdem.quantidade_planejada).toLocaleString('pt-BR')}{' '}
                  {selectedOrdem.produtos?.unidade_medida}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                  Previsão
                </p>
                <p className="text-sm text-blue-900 font-semibold mt-1">
                  {new Date(selectedOrdem.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operador e Máquina */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Operador e Máquina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="func-search">Buscar Funcionário</Label>
            <Input
              id="func-search"
              placeholder="Digite nome ou matrícula..."
              value={funcSearch}
              onChange={(e) => setFuncSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="funcionario">Funcionário *</Label>
            <Select value={funcionarioId} onValueChange={setFuncionarioId}>
              <SelectTrigger id="funcionario">
                <SelectValue placeholder="Selecione o funcionário..." />
              </SelectTrigger>
              <SelectContent>
                {filteredFuncionarios.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    [{f.matricula}] {f.nome} — {f.setor}
                  </SelectItem>
                ))}
                {filteredFuncionarios.length === 0 && (
                  <div className="py-2 px-3 text-sm text-gray-400">Nenhum resultado</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="maquina">Máquina / Centro de Trabalho *</Label>
            <Select value={maquinaId} onValueChange={setMaquinaId}>
              <SelectTrigger id="maquina">
                <SelectValue placeholder="Selecione a máquina..." />
              </SelectTrigger>
              <SelectContent>
                {maquinas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    [{m.codigo}] {m.descricao} — {m.setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quantidades */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quantidades Produzidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qtd-produzida">
                Quantidade Produzida *
                {selectedOrdem && (
                  <span className="ml-1 text-xs text-gray-400">
                    ({selectedOrdem.produtos?.unidade_medida})
                  </span>
                )}
              </Label>
              <Input
                id="qtd-produzida"
                type="number"
                min="0"
                step="0.001"
                placeholder="0"
                value={qtdProduzida}
                onChange={(e) => setQtdProduzida(e.target.value)}
                className="font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qtd-refugo" className="text-red-700">
                Refugo (Scrap)
              </Label>
              <Input
                id="qtd-refugo"
                type="number"
                min="0"
                step="0.001"
                placeholder="0"
                value={qtdRefugo}
                onChange={(e) => setQtdRefugo(e.target.value)}
                className="border-red-200 focus-visible:ring-red-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qtd-retrabalho" className="text-orange-700">
                Retrabalho
              </Label>
              <Input
                id="qtd-retrabalho"
                type="number"
                min="0"
                step="0.001"
                placeholder="0"
                value={qtdRetrabalho}
                onChange={(e) => setQtdRetrabalho(e.target.value)}
                className="border-orange-200 focus-visible:ring-orange-400"
              />
            </div>
          </div>

          {qtdProduzida && Number(qtdProduzida) >= 0 && (
            <div className="mt-4 rounded-md bg-gray-50 border border-gray-200 p-3">
              {(() => {
                const prod = Number(qtdProduzida) || 0
                const ref = Number(qtdRefugo) || 0
                const ret = Number(qtdRetrabalho) || 0
                const total = prod + ref + ret
                const eff = total > 0 ? ((prod / total) * 100).toFixed(1) : '—'
                return (
                  <p className="text-sm text-gray-600">
                    Eficiência estimada:{' '}
                    <span className="font-semibold text-indigo-700">
                      {eff}
                      {eff !== '—' ? '%' : ''}
                    </span>{' '}
                    ({prod.toLocaleString('pt-BR')} boas / {total.toLocaleString('pt-BR')} total)
                  </p>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Período e Turno */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período e Turno</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data-inicio">Data/Hora Início *</Label>
              <Input
                id="data-inicio"
                type="datetime-local"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-fim">Data/Hora Fim *</Label>
              <Input
                id="data-fim"
                type="datetime-local"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="turno">Turno *</Label>
              <Select value={turno} onValueChange={(v) => setTurno(v as TurnoEnum)}>
                <SelectTrigger id="turno">
                  <SelectValue placeholder="Selecione o turno..." />
                </SelectTrigger>
                <SelectContent>
                  {turnoOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Descreva ocorrências, paradas, problemas encontrados..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Apontamento'
          )}
        </Button>
      </div>
    </form>
  )
}
