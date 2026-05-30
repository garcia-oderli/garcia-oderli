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

const sectionTitle = (text: string) => (
  <h3 style={{
    fontFamily: 'Barlow Condensed, sans-serif',
    fontWeight: 700,
    fontSize: '13px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#F5A623',
    margin: 0,
  }}>{text}</h3>
)

const fieldLabel = (text: string, htmlFor?: string, style?: React.CSSProperties) => (
  <label htmlFor={htmlFor} style={{
    fontFamily: 'Barlow Condensed, sans-serif',
    fontWeight: 600,
    fontSize: '11px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#888888',
    display: 'block',
    marginBottom: '6px',
    ...style,
  }}>{text}</label>
)

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: '16px' }}>
        <CheckCircle2 style={{ width: '64px', height: '64px', color: '#4CAF50' }} />
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '22px', letterSpacing: '0.05em', color: '#F5F5F5', textTransform: 'uppercase', margin: 0 }}>
          Apontamento registrado com sucesso!
        </h2>
        <p style={{ color: '#888888', fontSize: '14px' }}>Redirecionando para a lista...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          borderRadius: '6px',
          border: '1px solid #F44336',
          background: 'rgba(244, 67, 54, 0.1)',
          padding: '12px 16px',
          color: '#F44336',
        }}>
          <AlertCircle style={{ width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '13px', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Ordem de Produção */}
      <Card>
        <CardHeader>{sectionTitle('Ordem de Produção')}</CardHeader>
        <CardContent className="space-y-4">
          <div>
            {fieldLabel('Ordem de Produção *', 'ordem')}
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              borderRadius: '6px',
              background: '#222222',
              border: '1px solid #2A2A2A',
              padding: '16px',
            }}>
              <div>
                <p style={{ fontSize: '10px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F5A623', margin: '0 0 4px 0' }}>Produto</p>
                <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: '#F5F5F5', margin: '0 0 2px 0' }}>
                  {selectedOrdem.produtos?.codigo}
                </p>
                <p style={{ fontSize: '11px', color: '#888888', margin: 0 }}>{selectedOrdem.produtos?.descricao}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F5A623', margin: '0 0 4px 0' }}>Qtd. Planejada</p>
                <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: '#F5F5F5', margin: 0 }}>
                  {Number(selectedOrdem.quantidade_planejada).toLocaleString('pt-BR')}{' '}
                  {selectedOrdem.produtos?.unidade_medida}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '10px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F5A623', margin: '0 0 4px 0' }}>Previsão</p>
                <p style={{ fontSize: '13px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, color: '#F5F5F5', margin: 0 }}>
                  {new Date(selectedOrdem.data_prevista + 'T00:00:00').toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operador e Máquina */}
      <Card>
        <CardHeader>{sectionTitle('Operador e Máquina')}</CardHeader>
        <CardContent className="space-y-4">
          <div>
            {fieldLabel('Buscar Funcionário', 'func-search')}
            <Input
              id="func-search"
              placeholder="Digite nome ou matrícula..."
              value={funcSearch}
              onChange={(e) => setFuncSearch(e.target.value)}
            />
          </div>
          <div>
            {fieldLabel('Funcionário *', 'funcionario')}
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
                  <div style={{ padding: '8px 12px', fontSize: '13px', color: '#888888' }}>Nenhum resultado</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <Separator style={{ background: '#2A2A2A' }} />

          <div>
            {fieldLabel('Máquina / Centro de Trabalho *', 'maquina')}
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
        <CardHeader>{sectionTitle('Quantidades Produzidas')}</CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              {fieldLabel(
                selectedOrdem ? `Quantidade Produzida * (${selectedOrdem.produtos?.unidade_medida})` : 'Quantidade Produzida *',
                'qtd-produzida'
              )}
              <Input
                id="qtd-produzida"
                type="number"
                min="0"
                step="0.001"
                placeholder="0"
                value={qtdProduzida}
                onChange={(e) => setQtdProduzida(e.target.value)}
                style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              />
            </div>
            <div>
              {fieldLabel('Refugo (Scrap)', 'qtd-refugo', { color: '#F44336' })}
              <Input
                id="qtd-refugo"
                type="number"
                min="0"
                step="0.001"
                placeholder="0"
                value={qtdRefugo}
                onChange={(e) => setQtdRefugo(e.target.value)}
                style={{ fontFamily: 'IBM Plex Mono, monospace', borderColor: 'rgba(244,67,54,0.4)' }}
              />
            </div>
            <div>
              {fieldLabel('Retrabalho', 'qtd-retrabalho', { color: '#FF9800' })}
              <Input
                id="qtd-retrabalho"
                type="number"
                min="0"
                step="0.001"
                placeholder="0"
                value={qtdRetrabalho}
                onChange={(e) => setQtdRetrabalho(e.target.value)}
                style={{ fontFamily: 'IBM Plex Mono, monospace', borderColor: 'rgba(255,152,0,0.4)' }}
              />
            </div>
          </div>

          {qtdProduzida && Number(qtdProduzida) >= 0 && (
            <div style={{ marginTop: '16px', borderRadius: '6px', background: '#222222', border: '1px solid #2A2A2A', padding: '12px 16px' }}>
              {(() => {
                const prod = Number(qtdProduzida) || 0
                const ref = Number(qtdRefugo) || 0
                const ret = Number(qtdRetrabalho) || 0
                const total = prod + ref + ret
                const eff = total > 0 ? ((prod / total) * 100).toFixed(1) : '—'
                return (
                  <p style={{ fontSize: '13px', color: '#888888', margin: 0 }}>
                    Eficiência estimada:{' '}
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#F5A623' }}>
                      {eff}{eff !== '—' ? '%' : ''}
                    </span>{' '}
                    <span style={{ color: '#3A3A3A' }}>({prod.toLocaleString('pt-BR')} boas / {total.toLocaleString('pt-BR')} total)</span>
                  </p>
                )
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Período e Turno */}
      <Card>
        <CardHeader>{sectionTitle('Período e Turno')}</CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              {fieldLabel('Data/Hora Início *', 'data-inicio')}
              <Input
                id="data-inicio"
                type="datetime-local"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              {fieldLabel('Data/Hora Fim *', 'data-fim')}
              <Input
                id="data-fim"
                type="datetime-local"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              {fieldLabel('Turno *', 'turno')}
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
        <CardHeader>{sectionTitle('Observações')}</CardHeader>
        <CardContent>
          <div>
            {fieldLabel('Observações (opcional)', 'observacoes')}
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
