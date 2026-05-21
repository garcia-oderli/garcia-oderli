# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

═══════════════════════════════════════════════
REGRAS OBRIGATÓRIAS DE ESTRUTURAÇÃO E ALTERAÇÃO DE CÓDIGO
═══════════════════════════════════════════════

OBJETIVO:
Todo código HTML, CSS e JavaScript deve ser modular, separado por blocos claros e editáveis individualmente, evitando necessidade de ler o arquivo inteiro para fazer alterações.

───────────────────────────────────────────────
PADRÃO DE ORGANIZAÇÃO OBRIGATÓRIO
───────────────────────────────────────────────

1. SEMPRE separar o sistema em blocos independentes:

/* ═══════════════════════════════════════
   MÓDULO: DASHBOARD
═══════════════════════════════════════ */

<!-- HTML -->
<section id="dashboard"></section>

<style id="dashboard-style"></style>

<script id="dashboard-script"></script>

2. NUNCA misturar:
- CSS espalhado
- JavaScript solto
- HTML gigante sem separação
- funções aleatórias fora do módulo

───────────────────────────────────────────────
PADRÃO DE MODULARIZAÇÃO
───────────────────────────────────────────────

Cada área do sistema deve possuir:

✅ BLOCO HTML
✅ BLOCO CSS
✅ BLOCO JS
✅ HEADER DO MÓDULO
✅ COMENTÁRIO PADRONIZADO

EXEMPLO:

<!-- ═══════════════════════════════════════
     MÓDULO: TABELA DE CUSTOS
═══════════════════════════════════════ -->

<section id="mod-custos"></section>

<style>
/* ── CSS: TABELA DE CUSTOS ── */
</style>

<script>
/* ── JS: TABELA DE CUSTOS ── */
</script>

───────────────────────────────────────────────
REGRA PRINCIPAL DE ALTERAÇÃO
───────────────────────────────────────────────

Quando houver pedido de alteração:

❌ NÃO ler nem reescrever o HTML inteiro
❌ NÃO modificar outras áreas
❌ NÃO reorganizar sistema completo sem necessidade

✅ ALTERAR SOMENTE:
- módulo solicitado
- função solicitada
- bloco solicitado
- componente solicitado

Ao modificar algo:
1. IDENTIFICAR O MÓDULO
2. ALTERAR SOMENTE O TRECHO NECESSÁRIO
3. RETORNAR APENAS o bloco/função/CSS/HTML alterado — NUNCA o arquivo inteiro

───────────────────────────────────────────────
PADRÃO DE COMENTÁRIOS
───────────────────────────────────────────────

/* ═══════════════════════════════════════
   MÓDULO: EXECUTIVO
═══════════════════════════════════════ */

/* ── KPI CARDS ── */
/* ── GRÁFICOS ── */
/* ── TABELA PRINCIPAL ── */

───────────────────────────────────────────────
PADRÃO DE NOMENCLATURA
───────────────────────────────────────────────

IDs:       mod-dashboard · mod-custos · mod-executivo
Classes:   dashboard-card · custos-table · exec-chart
Funções:   initDashboard() · renderCustos() · updateExecutivo()

───────────────────────────────────────────────
REGRA DE PERFORMANCE
───────────────────────────────────────────────

Priorizar: baixo acoplamento · funções pequenas · componentes reutilizáveis · manutenção rápida · alterações isoladas

Toda nova funcionalidade deve:
- nascer separada
- possuir bloco HTML, CSS e JS próprios
- possuir comentários próprios

═══════════════════════════════════════════════
SOBRE ESTE PROJETO
═══════════════════════════════════════════════

Dashboard de absenteísmo em HTML puro (single-file), exibido como **lousa** (tela grande/TV) na empresa. Lê dados de uma planilha Excel e renderiza tudo no lado do cliente — sem servidor, sem build, sem dependências instaladas.

Arquivo principal: `lousa_dashboard_faltas.html`
Deploy: copiado para `\\192.168.0.12\dados\PUBLICA\PROD\` e aberto no Chrome via `file://`.

───────────────────────────────────────────────
MÓDULOS DO ARQUIVO PRINCIPAL
───────────────────────────────────────────────

| Módulo                  | ID / Elemento          | Descrição                                      |
|-------------------------|------------------------|------------------------------------------------|
| Upload screen           | `#upload-screen`       | Tela inicial de seleção do arquivo Excel        |
| Header                  | `.hdr`                 | Filtros, relógio, contador de auto-refresh      |
| Ocorrências de Hoje     | `#today-card`          | KPIs e categorias do dia atual                  |
| Quadro Semanal          | `#thead-row / #tbody-quadro` | Tabela por semana e categoria             |
| Semana Atual por Dia    | `#day-cards`           | Cards seg–sex da semana corrente               |
| Resumo por Semana       | `#week-cards`          | Mini-cards com sparkline por semana            |
| KPIs                    | `.kpi-row`             | Total, média, maior e menor semana             |
| Ranking por Setor       | `#rank-list`           | Top 10 setores em grid 2 colunas               |
| Colaboradores           | `#dept-grid`           | Contagem ativa por departamento                |
| Gauge Absenteísmo       | `#gauge-svg`           | Velocímetro com índice internacional           |

───────────────────────────────────────────────
FLUXO DE DADOS
───────────────────────────────────────────────

1. `selectFile()` — File System Access API; handle salvo em IndexedDB (`lousa_v1`)
2. `tryRestoreHandle()` — restaura handle ao abrir a página (auto-carga)
3. `processBuffer(buffer, silent)` — lê abas `BASE` e `DP` do workbook
4. `render()` — filtra `allRows` e monta todos os módulos
5. `fitToScreen()` — aplica CSS `zoom` para caber na tela (lousa); usa `scrollHeight`

───────────────────────────────────────────────
PLANILHA EXCEL ESPERADA
───────────────────────────────────────────────

Aba `BASE`: `DATA`, `STATUS`, `SETOR`, `NOME`, `DEPARTAMENTO`, `COD`
Aba `DP` (opcional): `DEMISSÃO`, `ADMISSÃO`, `DEPARTAMENTO`

STATUS reconhecidos:
- Faltas just. → `ATESTADO`, `ATEST. OB.`, `JUST.`, `JUSTIFICATIVA`
- Ausência     → `FALTA`
- Atrasos      → `ATRASO`, `TARDE`, `BANCO H.`
- Afastamento  → `AFASTADO`, `LIC. MAT.`
- Ignorado     → `FÉRIAS`

───────────────────────────────────────────────
COMPORTAMENTOS IMPORTANTES
───────────────────────────────────────────────

- Primeira carga → sempre abre no **mês mais recente** dos dados
- Auto-refresh (dashboard visível) → preserva ano/mês/depto/setor selecionados
- `fitToScreen()` chamado com `setTimeout(..., 300)` após cada `render()`
- Auto-refresh a cada 5 min via `_fileHandle.getFile()` — sem interação do usuário
