import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export const maxDuration = 60

function limpa(s: string) {
  return s.replace(/\s+/g, ' ').trim()
}

function parseData(s: string): string | null {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{2,4})/)
  if (!m) return null
  const dia = m[1], mes = m[2]
  let ano = m[3]
  if (ano.length === 2) ano = '20' + ano
  if (parseInt(ano) < 2000 || parseInt(ano) > 2100) return null
  return `${ano}-${mes}-${dia}`
}

// Splits concatenated "DD/MM/YYDD/MM/YY..." (8 chars each) into individual dates.
function splitDates(raw: string): string[] {
  const dates: string[] = []
  const normalized = raw.replace(/\s/g, '')
  for (let i = 0; i <= normalized.length - 8; i += 8) {
    const chunk = normalized.slice(i, i + 8)
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(chunk)) {
      const d = parseData(chunk)
      if (d) dates.push(d)
    } else break
  }
  return dates
}

function parseBrFloat(s: string): number | null {
  const clean = s.trim().replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

function parseOneOf(text: string): Record<string, any> {
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

  // ── Compact inline format ─────────────────────────────────────────────────
  // e.g. "Lote Produção: 024810 1/1   OF: 791047   Qtde. À Produzir: 130,000"
  {
    const m = text.match(/\bOF[:\s]+(\d{4,8})/i)
    if (m) result.numero = m[1]
  }
  {
    const m = text.match(/Lote\s+Produ[çc][aã]o[:\s]+(\d{5,8})/i)
    if (m) result.lote = m[1]
  }
  {
    const m = text.match(/Qtde?\.?\s*[ÀA]\s*Produzir[:\s]+([\d.,]+)/i)
    if (m) result.quantidade_planejada = parseBrFloat(m[1])
  }
  // Dates inline: "Data Emissão: 01/06/26"
  if (!result.data_emissao) {
    const m = text.match(/Data\s+Emiss[aã]o[:\s]+([\d]{2}\/[\d]{2}\/[\d]{2,4})/i)
    if (m) result.data_emissao = parseData(m[1])
  }
  if (!result.data_prevista) {
    const m = text.match(/Data\s+Previs[aã]o(?:\s+(?:do\s+)?(?:Entrega)?)?[:\s]+([\d]{2}\/[\d]{2}\/[\d]{2,4})/i)
    if (m) result.data_prevista = parseData(m[1])
  }
  // Produto inline: "Produto: 106.045.117 HOME RIPADO..."
  if (!result.produto_codigo) {
    const m = text.match(/\bProduto[:\s]+([\d]{3}\.[\d]{3}\.[\d]{3})\s*([^\n]*)/i)
    if (m) {
      result.produto_codigo = limpa(m[1])
      const desc = limpa(m[2])
      if (desc) result.produto_descricao = desc
    }
  }

  // ── Old multi-line format (pdf-parse) ─────────────────────────────────────
  // OF/Lote/Qty on separate lines
  if (!result.numero) {
    const m = text.match(
      /OF:[^\d\n]*\n(?:[^\d\n][^\n]*\n)*(\d{4,8})\n(\d{6})\d*\/\d+[^\n]*\n\s*([\d.,]+)/i
    )
    if (m) {
      result.numero = m[1]
      result.lote   = m[2]
      result.quantidade_planejada = parseBrFloat(m[3])
    }
  }
  // Fallback classic one-line "024810 1/1 791104 60,000"
  if (!result.numero) {
    const m = text.match(/(\d{4,8})\s+\d+\/\d+\s+(\d{4,8})\s+([\d.,]+)/)
    if (m) {
      result.lote   = m[1]
      result.numero = m[2]
      result.quantidade_planejada = parseBrFloat(m[3])
    }
  }

  // Dates multi-line (concatenated): "Data Emissão:\n01/06/2601/06/26..."
  if (!result.data_emissao) {
    const m = text.match(/Data\s+Emiss[aã]o:\s*\n([\d\/]+)/i)
    if (m) {
      const datas = splitDates(m[1])
      if (datas.length >= 1) result.data_emissao = datas[0]
      if (datas.length >= 2) result.data_prevista = datas[datas.length - 1]
    }
  }
  if (!result.data_prevista) {
    const m = text.match(/Data\s+Previs[aã]o[:\s\n]+([\d\/]+)/i)
    if (m) result.data_prevista = parseData(m[1])
  }

  // Produto multi-line: description on line BEFORE "Produto:" label
  if (!result.produto_codigo) {
    const m = text.match(/([^\n]+)\nProduto[:\s]*\n([\d.]{5,})/i)
    if (m) {
      result.produto_descricao = limpa(m[1])
      result.produto_codigo    = limpa(m[2])
    }
  }
  if (!result.produto_codigo) {
    const m = text.match(/Produto[:\s\n]+([\d.]{5,})/i)
    if (m) result.produto_codigo = limpa(m[1])
  }

  // ── Observação ─────────────────────────────────────────────────────────────
  {
    const m = text.match(/Observa[çc][aã]o[:\s\n]+([^\n]+)/i)
    if (m) result.observacao = limpa(m[1])
  }

  // ── Operações ──────────────────────────────────────────────────────────────
  // Format A (multi-line): "{seq}\n{fase}\nPrevisão do Processo:\n{date}"
  {
    const prevRegex = /(\d{3})\n(\d{2})\nPrevis[aã]o do Processo:\n(\d{2}\/\d{2}\/\d{2,4})/gi
    let pm
    while ((pm = prevRegex.exec(text)) !== null) {
      const seq  = parseInt(pm[1])
      const fase = parseInt(pm[2]) || null
      const date = parseData(pm[3])
      const before = text.slice(Math.max(0, pm.index - 200), pm.index)
      const descLineMatch = before.match(
        /(CORTAR|FURAR|USINAR|COLAR\s+BORDA|PINTAR\s+UV|PINTAR\s+PU|PINTAR|LIXAR|MONTAR|EMBALAR|SERRAR|PREGAR|LACRAR)\s+([A-Z]{2,6}\d{2,4})/i
      )
      const dadosMatch = before.match(/[A-Z]{2,6}\d{2,4}[^\n]*\n((?:[^\n]+\n)+)$/)
      const dadosRaw = dadosMatch?.[1] ?? ''
      const dados = dadosRaw.split('\n')
        .map(l => l.trim()).filter(l => l && !/^\d/.test(l) && l !== '/')
        .join(' ') || null
      const tempoMatch = before.match(/\n\s+([\d,]+)\n[A-Z]/i)
      result.operacoes.push({
        sequencia:      seq,
        fase,
        descricao:      descLineMatch ? limpa(descLineMatch[1]) : `OP ${seq}`,
        maquina_codigo: descLineMatch ? limpa(descLineMatch[2]) : null,
        grupo:          null,
        dados_tecnicos: dados,
        tempo_producao: tempoMatch ? parseBrFloat(tempoMatch[1]) : null,
        data_previsao:  date,
        status:         'PENDENTE',
      })
    }
  }

  // Format B (compact inline): "Seq Fase Desc Machine ... Previsão do Processo: DD/MM/YY"
  if (result.operacoes.length === 0) {
    const prevRegex = /\bPrevis[aã]o\s+do\s+Processo[:\s]+([\d]{2}\/[\d]{2}\/[\d]{2,4})/gi
    let pm; let seq = 10
    while ((pm = prevRegex.exec(text)) !== null) {
      const date = parseData(pm[1])
      const before = text.slice(Math.max(0, pm.index - 400), pm.index)
      const descMatch = before.match(
        /(CORTAR|FURAR|USINAR|COLAR\s*BORDA|PINTAR\s*UV|PINTAR\s*PU|PINTAR|LIXAR|MONTAR|EMBALAR|SERRAR|PREGAR|LACRAR)\s+([A-Z]{2,6}\d{2,4})/i
      )
      const seqMatch = before.match(/(\d{3})\s+(\d{2})\s/)
      if (seqMatch) seq = parseInt(seqMatch[1])
      result.operacoes.push({
        sequencia:      seq,
        fase:           seqMatch ? (parseInt(seqMatch[2]) || null) : null,
        descricao:      descMatch ? limpa(descMatch[1]) : `OP ${seq}`,
        maquina_codigo: descMatch ? limpa(descMatch[2]) : null,
        grupo:          null,
        dados_tecnicos: null,
        tempo_producao: null,
        data_previsao:  date,
        status:         'PENDENTE',
      })
      seq += 10
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? ''

    let pages: string[] = []
    let debug = false

    if (contentType.includes('application/json')) {
      const body = await req.json()
      debug = body.debug === true
      if (body.pages && Array.isArray(body.pages)) {
        // Multi-page array from client-side PDF.js
        pages = body.pages as string[]
      } else if (body.text) {
        pages = [body.text as string]
      } else {
        return NextResponse.json({ error: 'Texto não enviado.' }, { status: 400 })
      }
    } else {
      // Legacy: binary PDF upload
      const form = await req.formData()
      const file = form.get('file') as File | null
      debug = form.get('debug') === '1'
      if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
      const buf = Buffer.from(await file.arrayBuffer())
      try {
        const data = await pdfParse(buf)
        pages = [data.text as string]
      } catch (parseErr: any) {
        return NextResponse.json(
          { error: `Erro ao ler o PDF: ${parseErr?.message ?? 'formato não suportado'}` },
          { status: 422 }
        )
      }
    }

    // Parse each page independently; keep pages that have an OF number
    const ordens = pages
      .map(p => parseOneOf(p))
      .filter(o => o.numero != null)

    // If nothing found per-page, try concatenated text (old single-OF PDFs)
    if (ordens.length === 0 && pages.length > 0) {
      const full = pages.join('\n')
      const single = parseOneOf(full)
      if (single.numero) ordens.push(single)
      else {
        // Return with debug even if unparsed
        const res: Record<string, any> = { ordens: [single] }
        if (debug) res._raw = full
        return NextResponse.json(res)
      }
    }

    const res: Record<string, any> = { ordens }
    if (debug) res._raw = pages.join('\n---PAGE---\n')
    return NextResponse.json(res)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro ao processar PDF.' }, { status: 500 })
  }
}
