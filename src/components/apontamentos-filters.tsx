'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Funcionario, Maquina } from '@/types/database'
import { X } from 'lucide-react'

interface Props {
  funcionarios: Funcionario[]
  maquinas: Maquina[]
}

const ALL_VALUE = 'all'

export function ApontamentosFilters({ funcionarios, maquinas }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (!value || value === ALL_VALUE) {
        next.delete(key)
      } else {
        next.set(key, value)
      }
      next.delete('page') // reset pagination on filter change
      router.push(`/apontamentos?${next.toString()}`)
    },
    [params, router]
  )

  const hasFilters =
    params.get('data_inicio') ||
    params.get('data_fim') ||
    params.get('turno') ||
    params.get('funcionario_id') ||
    params.get('maquina_id')

  const clearFilters = () => {
    router.push('/apontamentos')
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Filtros</h2>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
            <X className="h-3 w-3" />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Data início (de)</Label>
          <Input
            type="date"
            defaultValue={params.get('data_inicio') ?? ''}
            onChange={(e) => updateParam('data_inicio', e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Data início (até)</Label>
          <Input
            type="date"
            defaultValue={params.get('data_fim') ?? ''}
            onChange={(e) => updateParam('data_fim', e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Turno</Label>
          <Select
            defaultValue={params.get('turno') ?? ALL_VALUE}
            onValueChange={(v) => updateParam('turno', v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              <SelectItem value="MANHA">Manhã</SelectItem>
              <SelectItem value="TARDE">Tarde</SelectItem>
              <SelectItem value="NOITE">Noite</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Funcionário</Label>
          <Select
            defaultValue={params.get('funcionario_id') ?? ALL_VALUE}
            onValueChange={(v) => updateParam('funcionario_id', v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos</SelectItem>
              {funcionarios.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Máquina</Label>
          <Select
            defaultValue={params.get('maquina_id') ?? ALL_VALUE}
            onValueChange={(v) => updateParam('maquina_id', v)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas</SelectItem>
              {maquinas.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.codigo} — {m.descricao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
