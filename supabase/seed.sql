-- Seed data for Apontamento de Produção v1

-- Produtos
insert into produtos (codigo, descricao, unidade_medida) values
  ('PROD-001', 'Parafuso Sextavado M8x30', 'PC'),
  ('PROD-002', 'Porca Hexagonal M8', 'PC'),
  ('PROD-003', 'Arruela Lisa M8', 'PC'),
  ('PROD-004', 'Chapa de Aço 2mm 1000x2000', 'PC'),
  ('PROD-005', 'Tubo Redondo 25mm x 1,5mm', 'MT'),
  ('PROD-006', 'Perfil L 50x50x5mm', 'MT'),
  ('PROD-007', 'Eixo Torneado 30mm x 500mm', 'PC'),
  ('PROD-008', 'Flange 4 Furos DN50', 'PC'),
  ('PROD-009', 'Bucha de Bronze 30x35x40mm', 'PC'),
  ('PROD-010', 'Engrenagem Cilíndrica Z=24', 'PC')
on conflict (codigo) do nothing;

-- Funcionários
insert into funcionarios (matricula, nome, setor) values
  ('F001', 'João da Silva', 'Usinagem'),
  ('F002', 'Maria Oliveira', 'Usinagem'),
  ('F003', 'Carlos Souza', 'Montagem'),
  ('F004', 'Ana Costa', 'Montagem'),
  ('F005', 'Pedro Santos', 'Estamparia'),
  ('F006', 'Luciana Ferreira', 'Estamparia'),
  ('F007', 'Roberto Lima', 'Solda'),
  ('F008', 'Fernanda Rocha', 'Solda'),
  ('F009', 'Marcelo Pereira', 'Tratamento Superficial'),
  ('F010', 'Juliana Alves', 'Controle de Qualidade')
on conflict (matricula) do nothing;

-- Máquinas
insert into maquinas (codigo, descricao, setor) values
  ('MAQ-001', 'Torno CNC Romi GL240', 'Usinagem'),
  ('MAQ-002', 'Torno Convencional Nardini', 'Usinagem'),
  ('MAQ-003', 'Fresadora CNC Romi D800', 'Usinagem'),
  ('MAQ-004', 'Centro de Usinagem Mazak VCN-530C', 'Usinagem'),
  ('MAQ-005', 'Prensa Excêntrica 60T', 'Estamparia'),
  ('MAQ-006', 'Prensa Hidráulica 100T', 'Estamparia'),
  ('MAQ-007', 'Dobradeira Amada 80T', 'Estamparia'),
  ('MAQ-008', 'Solda MIG/MAG Lincoln', 'Solda'),
  ('MAQ-009', 'Solda TIG Miller', 'Solda'),
  ('MAQ-010', 'Linha de Montagem 01', 'Montagem')
on conflict (codigo) do nothing;

-- Ordens de Produção
insert into ordens_producao (numero, produto_id, quantidade_planejada, data_prevista, status)
select 'OP-2024-001', id, 1000, current_date + 7, 'EM_ANDAMENTO' from produtos where codigo = 'PROD-001'
on conflict (numero) do nothing;

insert into ordens_producao (numero, produto_id, quantidade_planejada, data_prevista, status)
select 'OP-2024-002', id, 500, current_date + 5, 'ABERTA' from produtos where codigo = 'PROD-002'
on conflict (numero) do nothing;

insert into ordens_producao (numero, produto_id, quantidade_planejada, data_prevista, status)
select 'OP-2024-003', id, 2000, current_date + 10, 'EM_ANDAMENTO' from produtos where codigo = 'PROD-003'
on conflict (numero) do nothing;

insert into ordens_producao (numero, produto_id, quantidade_planejada, data_prevista, status)
select 'OP-2024-004', id, 200, current_date + 3, 'ABERTA' from produtos where codigo = 'PROD-004'
on conflict (numero) do nothing;

insert into ordens_producao (numero, produto_id, quantidade_planejada, data_prevista, status)
select 'OP-2024-005', id, 50, current_date - 2, 'CONCLUIDA' from produtos where codigo = 'PROD-005'
on conflict (numero) do nothing;

insert into ordens_producao (numero, produto_id, quantidade_planejada, data_prevista, status)
select 'OP-2024-006', id, 300, current_date + 14, 'ABERTA' from produtos where codigo = 'PROD-006'
on conflict (numero) do nothing;

insert into ordens_producao (numero, produto_id, quantidade_planejada, data_prevista, status)
select 'OP-2024-007', id, 75, current_date + 1, 'EM_ANDAMENTO' from produtos where codigo = 'PROD-007'
on conflict (numero) do nothing;

insert into ordens_producao (numero, produto_id, quantidade_planejada, data_prevista, status)
select 'OP-2024-008', id, 150, current_date + 6, 'ABERTA' from produtos where codigo = 'PROD-008'
on conflict (numero) do nothing;
