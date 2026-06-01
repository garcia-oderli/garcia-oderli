import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

function limpa(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function parseData(s: string): string | null {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{2,4})/)
  if (!m) return null
  const dia = m[1], mes = m[2]
  let ano = m[3]
  if (ano.length === 2) ano = '20' + ano
  // Sanity check: year must be reasonable
  if (parseInt(ano) < 2000 || parseInt(ano) > 2100) return null
  return `${ano}-${mes}-${dia}`
}

function allDates(text: string): string[] {
  const matches = [...text.matchAll(/(\d{2})\/(\d{2})\/(\d{2,4})/g)]
  return matches.map(m => {
    const dia = m[1], mes = m[2]
    let ano = m[3]
    if (ano.length === 2) ano = '20' + ano
    if (parseInt(ano) < 2000 || parseInt(ano) > 2100) return null
    return `${ano}-${mes}-${dia}`
  }).filter(Boolean) as string[]
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const data = await pdfParse(buf)
    const text = data.text

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
    }

    // ── Linha com: {lote} {n/n} {OF} {qtd} ──────────────────────────────
    // Ex: "024811 1/1 791105 1,000"  ou  "024810 1/1 791104 60,000"
    const ofLoteMatch = text.match(/(\d{5,7})\s+\d+\/\d+\s+(\d{5,7})\s+([\d.,]+)/)
    if (ofLoteMatch) {
      result.lote   = ofLoteMatch[1]
      result.numero = ofLoteMatch[2]
      result.quantidade_planejada = parseFloat(
        ofLoteMatch[3].replace(/\./g, '').replace(',', '.')
      ) || null
    }

    // ── Datas ─────────────────────────────────────────────────────────────
    // Linha: "Data Emissão: 01/06/26 Data Abertura: Data Previsão: 01/06/26 16/06/26"
    // Precisamos: emissão = 1ª data, previsão = última data da linha
    const dataLinha = text.match(/Data\s+Emiss[aã]o[^\n]+/i)
    if (dataLinha) {
      const datas = allDates(dataLinha[0])
      if (datas.length >= 1) result.data_emissao = datas[0]
      if (datas.length >= 2) result.data_prevista = datas[datas.length - 1]
    }

    // ── Produto ──────────────────────────────────────────────────────────
    // Ex: "Produto: 783.023.116 BUFFET FLIP 1.2 TAMPO ... CINAMOMO UM: UN"
    const prodMatch = text.match(/Produto[:\s]+([\d.]+)\s+(.+?)\s+UM[:.\s]/i)
    if (prodMatch) {
      result.produto_codigo    = limpa(prodMatch[1])
      result.produto_descricao = limpa(prodMatch[2])
    }

    // ── Observação ────────────────────────────────────────────────────────
    const obsMatch = text.match(/Observa[çc][aã]o[:\s]+([^\n]+)/i)
    if (obsMatch) result.observacao = limpa(obsMatch[1])

    // ── Operações ─────────────────────────────────────────────────────────
    // Blocos no formato:
    //   {seq}\n{fase}\nDESCRICAO  MAQUINA  TEMPO\n{dados_tecnicos}\n{grupo}\nPrevisão do Processo: dd/mm/yy
    const opRegex = /(\d{3})\s*\n(\d{2})\s*\n([\w\s]+?)\s+([A-Z]{2,5}\d{2,3})\s+([\d,]+)\s*\n([^\n]*)\n([^\n]*)\nPrevis[aã]o\s+do\s+Processo[:\s]+(\d{2}\/\d{2}\/\d{2,4})/gim
    let opMatch
    while ((opMatch = opRegex.exec(text)) !== null) {
      result.operacoes.push({
        sequencia:       parseInt(opMatch[1]),
        fase:            parseInt(opMatch[2]) || null,
        descricao:       limpa(opMatch[3]),
        maquina_codigo:  limpa(opMatch[4]),
        grupo:           limpa(opMatch[6]) || null,
        dados_tecnicos:  limpa(opMatch[7]) || null,
        tempo_producao:  parseFloat(opMatch[5].replace(',', '.')) || null,
        data_previsao:   parseData(opMatch[8]),
        status:          'PENDENTE',
      })
    }

    // Fallback line-based extraction
    if (result.operacoes.length === 0) {
      const linhas = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
      const opKeywords = ['COLAR BORDA', 'PINTAR UV', 'PINTAR PU', 'PINTAR', 'CORTAR', 'FURAR', 'USINAR', 'LIXAR', 'MONTAR', 'EMBALAR']
      let seq = 10
      for (let i = 0; i < linhas.length; i++) {
        const l: string = linhas[i].toUpperCase()
        const desc = opKeywords.find((d: string) => l.startsWith(d))
        if (!desc) continue
        const parts: string[] = linhas[i].split(/\s+/)
        const maq  = parts.find((p: string) => /^[A-Z]{2,5}\d{2,3}$/.test(p)) ?? null
        const tempo = parts.find((p: string) => /^[\d,]+$/.test(p) && parseFloat(p.replace(',', '.')) < 1) ?? null
        const dadosLine = linhas[i + 1] && !/^\d/.test(linhas[i + 1]) ? linhas[i + 1] : null
        const prevLine  = linhas.slice(i, i + 8).find((x: string) => /Previs[aã]o.*\d{2}\/\d{2}/i.test(x))
        result.operacoes.push({
          sequencia:      seq,
          fase:           null,
          descricao:      desc,
          maquina_codigo: maq,
          grupo:          null,
          dados_tecnicos: dadosLine && dadosLine !== maq ? dadosLine : null,
          tempo_producao: tempo ? parseFloat(tempo.replace(',', '.')) : null,
          data_previsao:  prevLine ? parseData(prevLine) : null,
          status:         'PENDENTE',
        })
        seq += 10
      }
    }

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro ao processar PDF.' }, { status: 500 })
  }
}
