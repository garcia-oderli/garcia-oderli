# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

Dashboard de absenteísmo em HTML puro (single-file), exibido como **lousa** (tela grande/TV) na empresa. Lê dados de uma planilha Excel e renderiza tudo no lado do cliente — sem servidor, sem build, sem dependências instaladas.

## Arquivo principal

`lousa_dashboard_faltas.html` — arquivo único que contém HTML, CSS e JavaScript. Não há processo de build; editar o arquivo já é o resultado final.

## Dependências

Única dependência externa, carregada via CDN:
- `xlsx.full.min.js` (SheetJS v0.18.5) — leitura do `.xlsx` no browser

## Estrutura interna do HTML

```
<head>          CSS (variáveis :root, layout grid, cards, hoje, gauge)
<body>
  #upload-screen    Tela inicial de seleção de arquivo
  #loading          Overlay de carregamento
  #dashboard        Dashboard principal (oculto até carregar dados)
    .hdr            Cabeçalho sticky com filtros + relógio + contador refresh
    .body           Grid 2 colunas: col-left (1fr) | col-right (370px)
      col-left:     Quadro Semanal → Semana Atual por Dia → Resumo → KPIs → Ranking
      col-right:    Ocorrências de Hoje → Colaboradores → Gauge → (ranking foi movido)
    .footer
<script>        Todo o JavaScript inline
```

## Fluxo de dados

1. Usuário seleciona o `.xlsx` via `selectFile()` (usa **File System Access API** no Chrome)
2. Handle salvo no **IndexedDB** (`lousa_v1` / store `handles`) para auto-carga nas próximas aberturas
3. `processBuffer(buffer, silent)` lê as abas `BASE` e `DP` do workbook
4. `render()` filtra `allRows` pelo ano/mês/depto/setor selecionado e monta todos os componentes
5. `fitToScreen()` aplica CSS `zoom` para caber na resolução da tela (lousa)
6. Auto-refresh a cada 5 min via `_fileHandle.getFile()` — relê do disco sem interação

## Estrutura da planilha Excel esperada

**Aba `BASE`** (obrigatória):
- `DATA`, `STATUS`, `SETOR`, `NOME`, `DEPARTAMENTO`, `COD`

**Aba `DP`** (opcional — dados de colaboradores ativos):
- Linha de cabeçalho com `DEMISSÃO`, `ADMISSÃO`, `DEPARTAMENTO`

**Valores de STATUS reconhecidos:**
| Categoria       | Status no Excel                              |
|-----------------|----------------------------------------------|
| Faltas just.    | `ATESTADO`, `ATEST. OB.`, `JUST.`, `JUSTIFICATIVA` |
| Ausência        | `FALTA`                                      |
| Atrasos         | `ATRASO`, `TARDE`, `BANCO H.`                |
| Afastamento     | `AFASTADO`, `LIC. MAT.`                      |
| (ignorado)      | `FÉRIAS`                                     |

## Comportamento de seleção de mês

- Primeira carga: sempre vai para o **mês mais recente** nos dados
- Auto-refresh / trocar arquivo: preserva a seleção atual (ano/mês/depto/setor)
- A lógica está em `processBuffer()` — usa `dashVisible` para distinguir os dois casos

## Auto-escala (lousa)

`fitToScreen()` usa `scrollWidth`/`scrollHeight` do `#dashboard` para calcular o zoom. Chamado com `setTimeout(..., 300)` após cada `render()` para garantir layout completo.

## Deploy

O arquivo HTML é copiado diretamente para `\\192.168.0.12\dados\PUBLICA\PROD\` e acessado pelo navegador via esse caminho de rede. Não há servidor web — o Chrome abre como `file://`.
