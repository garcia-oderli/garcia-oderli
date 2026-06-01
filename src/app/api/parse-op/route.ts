import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export const maxDuration = 60 // seconds — Vercel Pro allows up to 300s

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

// Splits a concatenated date string like "01/06/2601/06/2616/06/26" into individual dates.
// Patrimar always uses 2-digit year (DD/MM/YY = 8 chars each).
function splitDates(raw: string): string[] {
  const dates: string[] = []
  const normalized = raw.replace(/\s/g, '')
  // Each date is exactly 8 chars: DD/MM/YY
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

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? ''

    let text: string
    let debug = false

    if (contentType.includes('application/json')) {
      // Text extracted client-side (PDF.js in browser) — no file size limit
      const body = await req.json()
      debug = body.debug === true
      if (!body.text) return NextResponse.json({ error: 'Texto não enviado.' }, { status: 400 })
      text = body.text as string
    } else {
      // Legacy: binary PDF upload (kept for compatibility)
      const form = await req.formData()
      const file = form.get('file') as File | null
      debug = form.get('debug') === '1'
      if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
      const buf = Buffer.from(await file.arrayBuffer())
      try {
        const data = await pdfParse(buf)
        text = data.text
      } catch (parseErr: any) {
        return NextResponse.json(
          { error: `Erro ao ler o PDF: ${parseErr?.message ?? 'formato não suportado'}` },
          { status: 422 }
        )
      }
    }

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

    if (debug) result._raw = text

    // ── OF / Lote / Quantidade ────────────────────────────────────────────
    // Patrimar pdf-parse header layout (each field on its own line):
    //   "OF:\nLote Produção:\nPATRIMAR MOVEIS LTDA\n{OF}\n{lote6digits}{fraction}\n{qty}"
    {
      const m = text.match(
        /OF:[^\d\n]*\n(?:[^\d\n][^\n]*\n)*(\d{4,8})\n(\d{6})\d*\/\d+[^\n]*\n\s*([\d.,]+)/i
      )
      if (m) {
        result.numero = m[1]
        result.lote   = m[2]
        result.quantidade_planejada = parseBrFloat(m[3])
      }
    }
    // Fallback: classic one-line format "024810 1/1 791104 60,000"
    if (!result.numero) {
      const m = text.match(/(\d{4,8})\s+\d+\/\d+\s+(\d{4,8})\s+([\d.,]+)/)
      if (m) {
        result.lote   = m[1]
        result.numero = m[2]
        result.quantidade_planejada = parseBrFloat(m[3])
      }
    }

    // ── Datas ─────────────────────────────────────────────────────────────
    // Dates are concatenated right after "Data Emissão:\n" label (2-digit year each):
    //   "Data Emissão:\n01/06/2601/06/2616/06/26"  → ["01/06/26","01/06/26","16/06/26"]
    {
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

    // ── Produto ──────────────────────────────────────────────────────────
    // pdf-parse puts description on the line BEFORE "Produto:" label:
    //   "NICHO 2.0 C F GAV 605X90X12 MDP 22 CINAMOMO\nProduto:\n763.022.116\nUM:\nUN"
    {
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

    // ── Observação ────────────────────────────────────────────────────────
    {
      const m = text.match(/Observa[çc][aã]o[:\s\n]+([^\n]+)/i)
      if (m) result.observacao = limpa(m[1])
    }

    // ── Operações ─────────────────────────────────────────────────────────
    // Each op block ends with: "{seq}\n{fase}\nPrevisão do Processo:\n{date}"
    // Just before that (within ~200 chars): "{tempo}\n{DESC}   {MACHINE}\n..."
    {
      const prevRegex = /(\d{3})\n(\d{2})\nPrevis[aã]o do Processo:\n(\d{2}\/\d{2}\/\d{2,4})/gi
      let pm
      while ((pm = prevRegex.exec(text)) !== null) {
        const seq  = parseInt(pm[1])
        const fase = parseInt(pm[2]) || null
        const date = parseData(pm[3])

        // Only look back 200 chars to stay within the current op block
        const before = text.slice(Math.max(0, pm.index - 200), pm.index)

        // "CORTAR                        SEC01" — desc + machine on one line
        const descLineMatch = before.match(
          /(CORTAR|FURAR|USINAR|COLAR\s+BORDA|PINTAR\s+UV|PINTAR\s+PU|PINTAR|LIXAR|MONTAR|EMBALAR|SERRAR|PREGAR|LACRAR)\s+([A-Z]{2,6}\d{2,4})/i
        )

        // Dados técnicos: lines between machine line and seq/fase
        const dadosMatch = before.match(/[A-Z]{2,6}\d{2,4}[^\n]*\n((?:[^\n]+\n)+)$/)
        const dadosRaw = dadosMatch?.[1] ?? ''
        const dados = dadosRaw.split('\n')
          .map(l => l.trim()).filter(l => l && !/^\d/.test(l) && l !== '/')
          .join(' ') || null

        // Tempo produção: indented number right before desc line
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

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Erro ao processar PDF.' }, { status: 500 })
  }
}
