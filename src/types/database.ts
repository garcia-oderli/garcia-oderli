export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type TurnoEnum = 'MANHA' | 'TARDE' | 'NOITE'
export type StatusOrdem = 'ABERTA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA'

export interface Database {
  public: {
    Tables: {
      produtos: {
        Row: {
          id: string
          codigo: string
          descricao: string
          unidade_medida: string
          created_at: string
        }
        Insert: {
          id?: string
          codigo: string
          descricao: string
          unidade_medida?: string
          created_at?: string
        }
        Update: {
          id?: string
          codigo?: string
          descricao?: string
          unidade_medida?: string
          created_at?: string
        }
      }
      funcionarios: {
        Row: {
          id: string
          matricula: string
          nome: string
          setor: string
          created_at: string
        }
        Insert: {
          id?: string
          matricula: string
          nome: string
          setor: string
          created_at?: string
        }
        Update: {
          id?: string
          matricula?: string
          nome?: string
          setor?: string
          created_at?: string
        }
      }
      maquinas: {
        Row: {
          id: string
          codigo: string
          descricao: string
          setor: string
          created_at: string
        }
        Insert: {
          id?: string
          codigo: string
          descricao: string
          setor: string
          created_at?: string
        }
        Update: {
          id?: string
          codigo?: string
          descricao?: string
          setor?: string
          created_at?: string
        }
      }
      ordens_producao: {
        Row: {
          id: string
          numero: string
          produto_id: string
          quantidade_planejada: number
          data_prevista: string
          status: StatusOrdem
          created_at: string
        }
        Insert: {
          id?: string
          numero: string
          produto_id: string
          quantidade_planejada: number
          data_prevista: string
          status?: StatusOrdem
          created_at?: string
        }
        Update: {
          id?: string
          numero?: string
          produto_id?: string
          quantidade_planejada?: number
          data_prevista?: string
          status?: StatusOrdem
          created_at?: string
        }
      }
      apontamentos: {
        Row: {
          id: string
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
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ordem_producao_id: string
          produto_id: string
          funcionario_id: string
          maquina_id: string
          quantidade_produzida: number
          quantidade_refugo?: number
          quantidade_retrabalho?: number
          data_inicio: string
          data_fim: string
          turno: TurnoEnum
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ordem_producao_id?: string
          produto_id?: string
          funcionario_id?: string
          maquina_id?: string
          quantidade_produzida?: number
          quantidade_refugo?: number
          quantidade_retrabalho?: number
          data_inicio?: string
          data_fim?: string
          turno?: TurnoEnum
          observacoes?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      turno_enum: TurnoEnum
      status_ordem: StatusOrdem
    }
  }
}

// Convenience types for joined queries
export type Produto = Database['public']['Tables']['produtos']['Row']
export type Funcionario = Database['public']['Tables']['funcionarios']['Row']
export type Maquina = Database['public']['Tables']['maquinas']['Row']
export type OrdemProducao = Database['public']['Tables']['ordens_producao']['Row']
export type Apontamento = Database['public']['Tables']['apontamentos']['Row']

export type ApontamentoComRelacoes = Apontamento & {
  ordens_producao: Pick<OrdemProducao, 'numero'>
  produtos: Pick<Produto, 'codigo' | 'descricao' | 'unidade_medida'>
  funcionarios: Pick<Funcionario, 'matricula' | 'nome'>
  maquinas: Pick<Maquina, 'codigo' | 'descricao'>
}

export type OrdemProducaoComProduto = OrdemProducao & {
  produtos: Pick<Produto, 'codigo' | 'descricao' | 'unidade_medida'>
}
