-- Apontamento de Produção v1 - Initial Schema
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Produtos (Products)
create table if not exists produtos (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique,
  descricao text not null,
  unidade_medida text not null default 'UN',
  created_at timestamptz not null default now()
);

-- Funcionários (Employees/Operators)
create table if not exists funcionarios (
  id uuid primary key default uuid_generate_v4(),
  matricula text not null unique,
  nome text not null,
  setor text not null,
  created_at timestamptz not null default now()
);

-- Máquinas (Machines/Work Centers)
create table if not exists maquinas (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique,
  descricao text not null,
  setor text not null,
  created_at timestamptz not null default now()
);

-- Ordens de Produção (Production Orders)
create type status_ordem as enum ('ABERTA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

create table if not exists ordens_producao (
  id uuid primary key default uuid_generate_v4(),
  numero text not null unique,
  produto_id uuid not null references produtos(id) on delete restrict,
  quantidade_planejada numeric(12, 3) not null check (quantidade_planejada > 0),
  data_prevista date not null,
  status status_ordem not null default 'ABERTA',
  created_at timestamptz not null default now()
);

-- Turno enum
create type turno_enum as enum ('MANHA', 'TARDE', 'NOITE');

-- Apontamentos (Production Entries - main table)
create table if not exists apontamentos (
  id uuid primary key default uuid_generate_v4(),
  ordem_producao_id uuid not null references ordens_producao(id) on delete restrict,
  produto_id uuid not null references produtos(id) on delete restrict,
  funcionario_id uuid not null references funcionarios(id) on delete restrict,
  maquina_id uuid not null references maquinas(id) on delete restrict,
  quantidade_produzida numeric(12, 3) not null check (quantidade_produzida >= 0),
  quantidade_refugo numeric(12, 3) not null default 0 check (quantidade_refugo >= 0),
  quantidade_retrabalho numeric(12, 3) not null default 0 check (quantidade_retrabalho >= 0),
  data_inicio timestamptz not null,
  data_fim timestamptz not null,
  turno turno_enum not null,
  observacoes text,
  created_at timestamptz not null default now(),
  constraint data_fim_apos_inicio check (data_fim > data_inicio)
);

-- Indexes for common query patterns
create index if not exists idx_apontamentos_created_at on apontamentos(created_at desc);
create index if not exists idx_apontamentos_ordem_producao on apontamentos(ordem_producao_id);
create index if not exists idx_apontamentos_funcionario on apontamentos(funcionario_id);
create index if not exists idx_apontamentos_maquina on apontamentos(maquina_id);
create index if not exists idx_apontamentos_turno on apontamentos(turno);
create index if not exists idx_ordens_producao_status on ordens_producao(status);
create index if not exists idx_ordens_producao_numero on ordens_producao(numero);
