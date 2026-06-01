import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

function limpa(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function parseData(s: string): string | null {
  // Aceita dd/mm/yy ou dd/mm/yyyy
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{2,4})/)
  if (!m) return null
  let ano = m[3]
  if (ano.length === 2) ano = '20' + ano
  return `${ano}-${m[2]}-${m[1]}`
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const data = await pdfParse(buf)
    const text = data.text

    // ---- Extração com regex baseada no layout Patrimar ----
    const result: Record<string, any> = {
      numero: null,
      lote: null,
      data_emissao: null,
      data_prevista: null,
      produto_codigo: null,
      produto_descricao: null,
      quantidade_planejada: null,
      observacao: null,
      operacoes: [] as any[],
      texto_bruto: text,
    }

    // OF number: após "OF:" seguido de número
    const ofMatch = text.match(/OF[:\s]+(\d{5,8})/i)
    if (ofMatch) result.numero = ofMatch[1]

    // Lote: "024810 1/1" → pega a parte antes do "1/1"
    const loteMatch = text.match(/(\d{5,7})\s+\d+\/\d+\s+\d{5,8}/)
    if (loteMatch) result.lote = loteMatch[1]

    // Datas: Data Emissão e Data Previsão
    const emissaoMatch = text.match(/Data\s+Emiss[aã]o[:\s]+(\d{2}\/\d{2}\/\d{2,4})/i)
    if (emissaoMatch) result.data_emissao = parseData(emissaoMatch[1])

    const previsaoMatch = text.match(/Data\s+Previs[aã]o[:\s]+(\d{2}\/\d{2}\/\d{2,4})/i)
    if (previsaoMatch) result.data_prevista = parseData(previsaoMatch[1])

    // Qtde: "60,000" ou "1,000" após "Produzir"
    const qtdeMatch = text.match(/Qtde[.\s]+[aà]\s+Produzir[:\s]+([\d.,]+)/i)
      ?? text.match(/\d+\/\d+\s+\d{5,8}\s+([\d.,]+)/)
    if (qtdeMatch) {
      result.quantidade_planejada = parseFloat(qtdeMatch[1].replace(/\./g, '').replace(',', '.')) || null
    }

    // Produto: linha com código + descrição (ex: "763.022.116 NICHO 2.0 C F GAV...")
    const produtoMatch = text.match(/Produto[:\s]+([\d.]+)\s+([^\n]+?)(?:\s+UM[:\s]|$)/im)
    if (produtoMatch) {
      result.produto_codigo = limpa(produtoMatch[1])
      result.produto_descricao = limpa(produtoMatch[2])
    }

    // Observação: após "Observa" ou "OBS" (não a obs de furação)
    const obsMatch = text.match(/Observa[çc][aã]o[:\s]+([^\n]+)/i)
    if (obsMatch) result.observacao = limpa(obsMatch[1])

    // ---- Operações ----
    // Padrão: linha com "CORTAR", "FURAR", etc. seguida de máquina e tempo
    // Captura blocos: sequencia + descrição + máquina + grupo + tempo + data previsão
    const opRegex = /(\d{3})\s*\n(\d{2})\s*\n([\w\s]+?)\s+([\w]+)\s+([\d,]+)\s*\n([^\n]*)\s*\n([^\n]*)\s*\nPrevis[aã]o\s+do\s+Processo[:\s]+(\d{2}\/\d{2}\/\d{2,4})/gim
    let opMatch
    while ((opMatch = opRegex.exec(text)) !== null) {
      result.operacoes.push({
        sequencia: parseInt(opMatch[1]),
        fase: parseInt(opMatch[2]),
        descricao: limpa(opMatch[3]),
        maquina_codigo: limpa(opMatch[4]),
        grupo: limpa(opMatch[6]) || null,
        dados_tecnicos: limpa(opMatch[7]) || null,
        tempo_producao: parseFloat(opMatch[5].replace(',', '.')) || null,
        data_previsao: parseData(opMatch[8]),
        status: 'PENDENTE',
      })
    }

    // Fallback: regex mais simples se o padrão acima não capturou nada
    if (result.operacoes.length === 0) {
      const linhas = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
      const opDescricoes = ['CORTAR', 'FURAR', 'COLAR BORDA', 'COLAR', 'USINAR', 'PINTAR UV', 'PINTAR PU', 'PINTAR', 'LIXAR', 'MONTAR', 'EMBALAR']
      let seq = 10
      for (let i = 0; i < linhas.length; i++) {
        const l: string = linhas[i]
        const desc = opDescricoes.find((d: string) => l.toUpperCase().startsWith(d))
        if (desc) {
          const parts: string[] = l.split(/\s+/)
          const maq = parts.find((p: string) => /^[A-Z]{2,5}\d{2,3}$/.test(p)) ?? null
          const tempo = parts.find((p: string) => /^\d+[,.\d]+$/.test(p) && parseFloat(p.replace(',', '.')) < 1) ?? null
          const dadosLine = linhas[i + 1] && !/^\d/.test(linhas[i + 1]) ? linhas[i + 1] : null
          const previsaoLine = linhas.slice(i, i + 8).find((x: string) => x.match(/Previs[aã]o.*\d{2}\/\d{2}/i))
          const previsaoDate = previsaoLine ? parseData(previsaoLine) : null

          result.operacoes.push({
            sequencia: seq,
            fase: null,
            descricao: desc,
            maquina_codigo: maq,
            grupo: null,
            dados_tecnicos: dadosLine && dadosLine !== maq ? dadosLine : null,
            tempo_producao: tempo ? parseFloat(tempo.replace(',', '.')) : null,
            data_previsao: previsaoDate,
            status: 'PENDENTE',
          })
          seq += 10
        }
      }
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro ao processar PDF.' }, { status: 500 })
  }
}
