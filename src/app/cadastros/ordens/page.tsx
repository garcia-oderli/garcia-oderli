'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ClipboardList, Plus, Pencil, Trash2, Check, X, Lock, ChevronDown, ChevronRight, Wrench, Upload, FileText, AlertTriangle } from 'lucide-react'
import type { StatusOrdem } from '@/types/database'

const statusColors: Record<StatusOrdem, string> = {
  ABERTA: '#4CAF50',
  EM_ANDAMENTO: '#F5A623',
  CONCLUIDA: '#888888',
  CANCELADA: '#F44336',
}
const statusLabels: Record<StatusOrdem, string> = {
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}
const opStatusColors: Record<string, string> = {
  PENDENTE: '#444',
  EM_ANDAMENTO: '#F5A623',
  CONCLUIDA: '#4CAF50',
}
const opStatusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
}

function fmtDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt + 'T12:00:00').toLocaleDateString('pt-BR')
}

const inp: React.CSSProperties = { background: '#111', border: '1px solid #2A2A2A', color: '#F5F5F5', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }
const inpSm: React.CSSProperties = { ...inp, padding: '5px 8px', fontSize: '12px' }

interface Operacao {
  id: string
  ordem_id: string
  sequencia: number
  fase: number | null
  descricao: string
  maquina_codigo: string | null
  grupo: string | null
  dados_tecnicos: string | null
  tempo_producao: number | null
  data_previsao: string | null
  status: string
}

const emptyOp = (): Omit<Operacao, 'id' | 'ordem_id'> => ({
  sequencia: 10,
  fase: null,
  descricao: '',
  maquina_codigo: '',
  grupo: '',
  dados_tecnicos: '',
  tempo_producao: null,
  data_previsao: null,
  status: 'PENDENTE',
})

export default function OrdensPage() {
  const [ordens, setOrdens] = useState<any[]>([])
  const [operacoes, setOperacoes] = useState<Record<string, Operacao[]>>({})
  const [produtos, setProdutos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})
  const [editSaving, setEditSaving] = useState(false)

  // Op modal state
  const [opModal, setOpModal] = useState<{ ordemId: string; ordemNum: string; op: Omit<Operacao, 'id' | 'ordem_id'> | null; editId: string | null } | null>(null)
  const [opSaving, setOpSaving] = useState(false)

  // PDF import state
  const [pdfParsing, setPdfParsing] = useState(false)
  const [pdfPreview, setPdfPreview] = useState<any | null>(null)
  const [pdfImporting, setPdfImporting] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfParsing(true)
    setPdfPreview(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('debug', '1')
    // Warn about excessively large files
    if (file.size > 20 * 1024 * 1024) {
      setError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). O limite é 20 MB.`)
      setPdfParsing(false)
      return
    }
    try {
      const res = await fetch('/api/parse-op', { method: 'POST', body: fd })
      let data: any
      try {
        data = await res.json()
      } catch {
        setError(`Erro do servidor (HTTP ${res.status}): resposta inválida. Tente um PDF menor.`)
        setPdfParsing(false)
        return
      }
      if (data.error) { setError(data.error); setPdfParsing(false); return }
      setPdfPreview(data)
    } catch (err: any) {
      setError(`Erro ao enviar o PDF: ${err?.message ?? 'verifique sua conexão.'}`)
    }
    setPdfParsing(false)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  const importarPdf = async () => {
    if (!pdfPreview) return
    setPdfImporting(true)
    const supabase = createClient()

    // Tenta achar produto pelo código
    let produto_id: string | null = null
    if (pdfPreview.produto_codigo) {
      const { data: prods } = await (supabase as any)
        .from('produtos').select('id').ilike('codigo', pdfPreview.produto_codigo).limit(1)
      if (prods?.length) produto_id = prods[0].id
    }

    const payload = {
      numero: pdfPreview.numero ?? 'IMPORTADA',
      lote: pdfPreview.lote ?? null,
      data_emissao: pdfPreview.data_emissao ?? null,
      produto_id: produto_id ?? null,
      quantidade_planejada: pdfPreview.quantidade_planejada ?? 0,
      data_prevista: pdfPreview.data_prevista ?? new Date().toISOString().slice(0, 10),
      status: 'ABERTA',
      observacao: pdfPreview.observacao ?? null,
    }

    // Upsert by numero — if OF already exists, update it
    const { data: ordemData, error: ordemErr } = await (supabase as any)
      .from('ordens_producao')
      .upsert(payload, { onConflict: 'numero', ignoreDuplicates: false })
      .select('id').single()

    if (ordemErr) { setError(ordemErr.message); setPdfImporting(false); return }

    if (pdfPreview.operacoes?.length > 0) {
      await (supabase as any).from('ordens_operacoes').insert(
        pdfPreview.operacoes.map((op: any) => ({ ...op, ordem_id: ordemData.id }))
      )
    }

    setPdfPreview(null)
    setPdfImporting(false)
    showSuccess(`OF ${pdfPreview.numero} importada com ${pdfPreview.operacoes?.length ?? 0} operações!`)
    fetchData()
  }

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const [ordensRes, produtosRes, opRes] = await Promise.all([
      (supabase as any)
        .from('ordens_producao')
        .select('id, numero, lote, data_emissao, produto_id, quantidade_planejada, data_prevista, status, observacao, created_at, produtos(codigo, descricao)')
        .order('created_at', { ascending: false }),
      supabase.from('produtos').select('id, codigo, descricao').order('codigo'),
      (supabase as any).from('ordens_operacoes').select('*').order('sequencia'),
    ])
    setOrdens(ordensRes.data ?? [])
    setProdutos(produtosRes.data ?? [])
    const opMap: Record<string, Operacao[]> = {}
    for (const op of (opRes.data ?? [])) {
      if (!opMap[op.ordem_id]) opMap[op.ordem_id] = []
      opMap[op.ordem_id].push(op)
    }
    setOperacoes(opMap)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const showSuccess = (msg: string) => { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const produto_id = fd.get('produto_id') as string
    if (!produto_id) { setError('Selecione um produto.'); return }
    setSubmitting(true)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('ordens_producao') as any).insert({
      numero: fd.get('numero') as string,
      lote: (fd.get('lote') as string) || null,
      data_emissao: (fd.get('data_emissao') as string) || null,
      produto_id,
      quantidade_planejada: Number(fd.get('quantidade_planejada')),
      data_prevista: fd.get('data_prevista') as string,
      status: (fd.get('status') as string) || 'ABERTA',
      observacao: (fd.get('observacao') as string) || null,
    })
    if (dbError) { setError(dbError.message) }
    else { showSuccess('Ordem criada!'); formRef.current?.reset(); fetchData() }
    setSubmitting(false)
  }

  const startEdit = (o: any) => {
    setEditingId(o.id)
    setEditValues({
      numero: o.numero, lote: o.lote ?? '', data_emissao: o.data_emissao ?? '',
      produto_id: o.produto_id ?? '', quantidade_planejada: String(o.quantidade_planejada),
      data_prevista: o.data_prevista, status: o.status, observacao: o.observacao ?? '',
    })
  }

  const saveEdit = async (id: string) => {
    setEditSaving(true)
    const supabase = createClient()
    const { error: dbError } = await (supabase.from('ordens_producao') as any).update({
      numero: editValues.numero, lote: editValues.lote || null,
      data_emissao: editValues.data_emissao || null,
      produto_id: editValues.produto_id,
      quantidade_planejada: Number(editValues.quantidade_planejada),
      data_prevista: editValues.data_prevista, status: editValues.status,
      observacao: editValues.observacao || null,
    }).eq('id', id)
    if (dbError) setError(dbError.message)
    else { setEditingId(null); fetchData() }
    setEditSaving(false)
  }

  const handleDelete = async (id: string, numero: string) => {
    if (!window.confirm(`Excluir a ordem "${numero}"?`)) return
    const supabase = createClient()
    await (supabase.from('ordens_producao') as any).delete().eq('id', id)
    fetchData()
  }

  const handleFechar = async (id: string, numero: string) => {
    if (!window.confirm(`Fechar a OF "${numero}"?`)) return
    const supabase = createClient()
    await (supabase.from('ordens_producao') as any).update({ status: 'CONCLUIDA' }).eq('id', id)
    fetchData()
  }

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ----- Operations -----
  const openAddOp = (ordemId: string, ordemNum: string) => {
    const ops = operacoes[ordemId] ?? []
    const lastSeq = ops.length > 0 ? Math.max(...ops.map(o => o.sequencia)) : 0
    const nextSeq = lastSeq + 10
    setOpModal({ ordemId, ordemNum, op: { ...emptyOp(), sequencia: nextSeq }, editId: null })
  }

  const openEditOp = (ordemId: string, ordemNum: string, op: Operacao) => {
    setOpModal({
      ordemId, ordemNum, editId: op.id,
      op: {
        sequencia: op.sequencia, fase: op.fase, descricao: op.descricao,
        maquina_codigo: op.maquina_codigo ?? '', grupo: op.grupo ?? '',
        dados_tecnicos: op.dados_tecnicos ?? '', tempo_producao: op.tempo_producao,
        data_previsao: op.data_previsao, status: op.status,
      },
    })
  }

  const saveOp = async () => {
    if (!opModal?.op) return
    setOpSaving(true)
    const supabase = createClient()
    const payload = {
      ordem_id: opModal.ordemId,
      sequencia: Number(opModal.op.sequencia),
      fase: opModal.op.fase ? Number(opModal.op.fase) : null,
      descricao: opModal.op.descricao,
      maquina_codigo: opModal.op.maquina_codigo || null,
      grupo: opModal.op.grupo || null,
      dados_tecnicos: opModal.op.dados_tecnicos || null,
      tempo_producao: opModal.op.tempo_producao ? Number(opModal.op.tempo_producao) : null,
      data_previsao: opModal.op.data_previsao || null,
      status: opModal.op.status,
    }
    if (opModal.editId) {
      await (supabase as any).from('ordens_operacoes').update(payload).eq('id', opModal.editId)
    } else {
      await (supabase as any).from('ordens_operacoes').insert(payload)
    }
    setOpModal(null)
    setOpSaving(false)
    fetchData()
  }

  const deleteOp = async (opId: string) => {
    if (!window.confirm('Excluir esta operação?')) return
    const supabase = createClient()
    await (supabase as any).from('ordens_operacoes').delete().eq('id', opId)
    fetchData()
  }

  const toggleOpStatus = async (op: Operacao) => {
    const next = op.status === 'PENDENTE' ? 'EM_ANDAMENTO' : op.status === 'EM_ANDAMENTO' ? 'CONCLUIDA' : 'PENDENTE'
    const supabase = createClient()
    await (supabase as any).from('ordens_operacoes').update({ status: next }).eq('id', op.id)
    fetchData()
  }

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '28px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5F5F5', margin: 0 }}>
            ORDENS DE PRODUÇÃO
          </h1>
          <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
            {ordens.length} {ordens.length === 1 ? 'ordem' : 'ordens'} cadastradas
          </p>
        </div>
        <ClipboardList size={32} style={{ color: '#F5A623' }} />
      </div>

      {error && <div style={{ background: '#2a1212', border: '1px solid #F44336', color: '#F44336', borderRadius: '6px', padding: '10px 14px', fontSize: '13px' }}>Erro: {error}</div>}
      {success && <div style={{ background: '#122a12', border: '1px solid #4CAF50', color: '#4CAF50', borderRadius: '6px', padding: '10px 14px', fontSize: '13px' }}>{success}</div>}

      {/* PDF Import */}
      <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FileText size={16} style={{ color: '#4A9EDF' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '15px', letterSpacing: '0.08em', color: '#4A9EDF' }}>IMPORTAR PDF DA OP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#1A2A3A', border: '1px solid #2A4A6A', color: '#4A9EDF', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em' }}>
            <Upload size={14} />
            {pdfParsing ? 'Lendo PDF...' : 'Selecionar PDF'}
            <input ref={pdfInputRef} type="file" accept=".pdf" onChange={handlePdfUpload} style={{ display: 'none' }} disabled={pdfParsing} />
          </label>
          <span style={{ fontSize: '12px', color: '#444' }}>Selecione o PDF da Ordem de Produção (Patrimar)</span>
        </div>

        {/* Preview */}
        {pdfPreview && (
          <div style={{ marginTop: '16px', background: '#111', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F5A623', letterSpacing: '0.06em' }}>
                PRÉVIA — REVISE ANTES DE IMPORTAR
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={importarPdf} disabled={pdfImporting}
                  style={{ padding: '7px 16px', background: '#F5A623', border: 'none', borderRadius: '6px', color: '#111', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: pdfImporting ? 0.6 : 1 }}>
                  {pdfImporting ? 'Importando...' : '✓ Confirmar Importação'}
                </button>
                <button onClick={() => setPdfPreview(null)}
                  style={{ padding: '7px 12px', background: '#2A2A2A', border: 'none', borderRadius: '6px', color: '#888', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>

            {/* OF fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'OF', value: pdfPreview.numero },
                { label: 'Lote', value: pdfPreview.lote },
                { label: 'Emissão', value: pdfPreview.data_emissao },
                { label: 'Previsão', value: pdfPreview.data_prevista },
                { label: 'Qtd. Planejada', value: pdfPreview.quantidade_planejada?.toLocaleString('pt-BR') },
                { label: 'Observação', value: pdfPreview.observacao },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>{f.label}</div>
                  <div style={{ fontSize: '13px', color: f.value ? '#F5F5F5' : '#444', fontFamily: f.value ? undefined : 'inherit' }}>
                    {f.value ?? <span style={{ color: '#444', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={11} /> não detectado</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Produto */}
            <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#1A1A1A', borderRadius: '6px', border: '1px solid #2A2A2A' }}>
              <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Produto</div>
              <div style={{ fontSize: '14px', color: '#F5F5F5', fontWeight: 600 }}>
                {pdfPreview.produto_codigo && <span style={{ color: '#F5A623', marginRight: '8px' }}>{pdfPreview.produto_codigo}</span>}
                {pdfPreview.produto_descricao ?? <span style={{ color: '#444' }}>não detectado</span>}
              </div>
              <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>
                {pdfPreview.produto_codigo ? 'Será vinculado automaticamente se o código existir nos produtos cadastrados.' : ''}
              </div>
            </div>

            {/* Operations preview */}
            <div>
              <div style={{ fontSize: '11px', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                Operações detectadas ({pdfPreview.operacoes?.length ?? 0})
              </div>
              {pdfPreview.operacoes?.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={12} /> Nenhuma operação detectada — você pode adicionar manualmente após importar.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {pdfPreview.operacoes.map((op: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1C1C1C', border: '1px solid #222', borderRadius: '5px', padding: '7px 10px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '12px', color: '#555', minWidth: '28px' }}>
                        {String(op.sequencia).padStart(3, '0')}
                      </span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F5F5F5', flex: 1 }}>
                        {op.descricao}
                      </span>
                      {op.maquina_codigo && (
                        <span style={{ fontSize: '12px', color: '#888', background: '#222', padding: '2px 7px', borderRadius: '4px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                          {op.maquina_codigo}
                        </span>
                      )}
                      {op.dados_tecnicos && <span style={{ fontSize: '11px', color: '#666' }}>{op.dados_tecnicos}</span>}
                      {op.data_previsao && <span style={{ fontSize: '11px', color: '#555' }}>{op.data_previsao}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Debug: raw text when key fields missing */}
            {(!pdfPreview.numero || !pdfPreview.quantidade_planejada) && pdfPreview._raw && (
              <details style={{ marginTop: '12px' }}>
                <summary style={{ fontSize: '11px', color: '#555', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Texto bruto extraído do PDF (diagnóstico)
                </summary>
                <pre style={{ fontSize: '10px', color: '#666', background: '#111', padding: '10px', borderRadius: '6px', overflow: 'auto', maxHeight: '200px', whiteSpace: 'pre-wrap', marginTop: '8px' }}>
                  {pdfPreview._raw}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Plus size={16} style={{ color: '#F5A623' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '15px', letterSpacing: '0.08em', color: '#F5A623' }}>NOVA ORDEM</span>
        </div>
        <form ref={formRef} onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>OF (Nº) *</label>
              <input name="numero" required placeholder="791104" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Lote</label>
              <input name="lote" placeholder="024810" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Data Emissão</label>
              <input name="data_emissao" type="date" style={{ ...inp, colorScheme: 'dark' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Produto *</label>
              <select name="produto_id" required style={inp}>
                <option value="">Selecione...</option>
                {produtos.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Qtd. Planejada *</label>
              <input name="quantidade_planejada" type="number" min="1" required placeholder="1000" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Data Previsão *</label>
              <input name="data_prevista" type="date" required style={{ ...inp, colorScheme: 'dark' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Status</label>
              <select name="status" style={inp}>
                <option value="ABERTA">Aberta</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Observação</label>
              <input name="observacao" placeholder="**AMARELO**, ex: prioridade..." style={inp} />
            </div>
          </div>
          <button type="submit" disabled={submitting}
            style={{ padding: '9px 24px', background: '#F5A623', color: '#111', border: 'none', borderRadius: '6px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? 'Salvando...' : 'Salvar Ordem'}
          </button>
        </form>
      </div>

      {/* List */}
      <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '10px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ClipboardList size={14} style={{ color: '#888' }} />
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.08em', color: '#F5F5F5' }}>LISTA DE ORDENS</span>
        </div>

        {ordens.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#555' }}>Nenhuma ordem cadastrada.</div>
        ) : (
          <div>
            {ordens.map((o: any, i: number) => {
              const ops = operacoes[o.id] ?? []
              const expanded = expandedIds.has(o.id)
              const editing = editingId === o.id
              const opsConcluidas = ops.filter(op => op.status === 'CONCLUIDA').length
              const progresso = ops.length > 0 ? (opsConcluidas / ops.length) * 100 : 0
              const sc = statusColors[o.status as StatusOrdem]

              return (
                <div key={o.id} style={{ borderBottom: i < ordens.length - 1 ? '1px solid #2A2A2A' : undefined }}>
                  {/* Order row */}
                  {editing ? (
                    <div style={{ padding: '14px 16px', background: '#1A2030' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>OF *</label>
                          <input value={editValues.numero} onChange={e => setEditValues((v: any) => ({ ...v, numero: e.target.value }))} style={inpSm} />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Lote</label>
                          <input value={editValues.lote} onChange={e => setEditValues((v: any) => ({ ...v, lote: e.target.value }))} style={inpSm} />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Emissão</label>
                          <input type="date" value={editValues.data_emissao} onChange={e => setEditValues((v: any) => ({ ...v, data_emissao: e.target.value }))} style={{ ...inpSm, colorScheme: 'dark' }} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Produto</label>
                          <select value={editValues.produto_id} onChange={e => setEditValues((v: any) => ({ ...v, produto_id: e.target.value }))} style={inpSm}>
                            {produtos.map((p: any) => <option key={p.id} value={p.id}>{p.codigo} — {p.descricao}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Qtd.</label>
                          <input type="number" value={editValues.quantidade_planejada} onChange={e => setEditValues((v: any) => ({ ...v, quantidade_planejada: e.target.value }))} style={inpSm} />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Previsão</label>
                          <input type="date" value={editValues.data_prevista} onChange={e => setEditValues((v: any) => ({ ...v, data_prevista: e.target.value }))} style={{ ...inpSm, colorScheme: 'dark' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Status</label>
                          <select value={editValues.status} onChange={e => setEditValues((v: any) => ({ ...v, status: e.target.value }))} style={inpSm}>
                            <option value="ABERTA">Aberta</option>
                            <option value="EM_ANDAMENTO">Em Andamento</option>
                            <option value="CONCLUIDA">Concluída</option>
                            <option value="CANCELADA">Cancelada</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>Observação</label>
                          <input value={editValues.observacao} onChange={e => setEditValues((v: any) => ({ ...v, observacao: e.target.value }))} style={inpSm} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => saveEdit(o.id)} disabled={editSaving}
                          style={{ padding: '6px 14px', background: '#4CAF50', color: '#111', border: 'none', borderRadius: '5px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={12} /> Salvar
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ padding: '6px 14px', background: '#2A2A2A', color: '#888', border: 'none', borderRadius: '5px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <X size={12} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Expand toggle */}
                        <button onClick={() => toggleExpand(o.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: '2px', flexShrink: 0, marginTop: '2px' }}>
                          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        {/* OF info */}
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '16px', color: '#F5A623', letterSpacing: '0.06em' }}>
                              OF {o.numero}
                            </span>
                            {o.lote && (
                              <span style={{ fontSize: '11px', color: '#555', background: '#2A2A2A', padding: '1px 7px', borderRadius: '3px' }}>Lote {o.lote}</span>
                            )}
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: `${sc}22`, color: sc, border: `1px solid ${sc}44` }}>
                              {statusLabels[o.status as StatusOrdem]}
                            </span>
                            {o.observacao && (
                              <span style={{ fontSize: '11px', color: '#F5A623', background: '#2A1A00', padding: '1px 7px', borderRadius: '3px', border: '1px solid #F5A62333' }}>
                                {o.observacao}
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop: '3px', fontSize: '13px', color: '#F5F5F5' }}>
                            {o.produtos?.codigo} — {o.produtos?.descricao}
                          </div>
                          <div style={{ marginTop: '3px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: '#888' }}>
                              <span style={{ color: '#555' }}>Qtd: </span>
                              {Number(o.quantidade_planejada).toLocaleString('pt-BR')}
                            </span>
                            {o.data_emissao && <span style={{ fontSize: '12px', color: '#888' }}><span style={{ color: '#555' }}>Emissão: </span>{fmtDate(o.data_emissao)}</span>}
                            <span style={{ fontSize: '12px', color: '#888' }}><span style={{ color: '#555' }}>Previsão: </span>{fmtDate(o.data_prevista)}</span>
                          </div>
                          {/* Progress bar */}
                          {ops.length > 0 && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '4px', background: '#2A2A2A', borderRadius: '2px', overflow: 'hidden', maxWidth: '200px' }}>
                                <div style={{ height: '100%', width: `${progresso}%`, background: progresso === 100 ? '#4CAF50' : '#F5A623', borderRadius: '2px', transition: 'width 0.3s' }} />
                              </div>
                              <span style={{ fontSize: '11px', color: '#555' }}>
                                {opsConcluidas}/{ops.length} ops
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
                          <button onClick={() => openAddOp(o.id, o.numero)}
                            style={{ padding: '5px 10px', background: '#1A2A1A', border: '1px solid #4CAF5044', color: '#4CAF50', borderRadius: '5px', fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Plus size={11} /> Op
                          </button>
                          {(o.status === 'ABERTA' || o.status === 'EM_ANDAMENTO') && (
                            <button onClick={() => handleFechar(o.id, o.numero)}
                              style={{ padding: '5px 10px', background: '#12221A', border: '1px solid #4CAF5066', color: '#4CAF50', borderRadius: '5px', fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Lock size={11} /> Fechar
                            </button>
                          )}
                          <button onClick={() => startEdit(o)}
                            style={{ padding: '5px 10px', background: '#1A2A3A', border: '1px solid #2A4A6A', color: '#4A9EDF', borderRadius: '5px', fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Pencil size={11} /> Editar
                          </button>
                          <button onClick={() => handleDelete(o.id, o.numero)}
                            style={{ padding: '5px 10px', background: '#2a1212', border: '1px solid #F4433666', color: '#F44336', borderRadius: '5px', fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Operations expanded */}
                  {expanded && !editing && (
                    <div style={{ background: '#161616', borderTop: '1px solid #222', padding: '12px 16px 12px 42px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                        <Wrench size={12} style={{ color: '#555' }} />
                        <span style={{ fontSize: '11px', color: '#555', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Operações</span>
                      </div>

                      {ops.length === 0 ? (
                        <div style={{ fontSize: '12px', color: '#444', padding: '8px 0' }}>
                          Nenhuma operação. <button onClick={() => openAddOp(o.id, o.numero)} style={{ color: '#F5A623', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>Adicionar operação</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {ops.map(op => {
                            const osc = opStatusColors[op.status]
                            const hoje = new Date().toISOString().slice(0, 10)
                            const atrasada = op.data_previsao && op.data_previsao < hoje && op.status !== 'CONCLUIDA'
                            const diasAtr = atrasada && op.data_previsao
                              ? Math.floor((Date.now() - new Date(op.data_previsao + 'T12:00:00').getTime()) / 86400000)
                              : 0
                            return (
                              <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: atrasada ? '#1E1212' : '#1C1C1C', border: `1px solid ${atrasada ? '#F4433655' : '#222'}`, borderRadius: '6px', padding: '8px 12px', flexWrap: 'wrap' }}>
                                {/* Seq */}
                                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', color: '#444', minWidth: '30px' }}>
                                  {String(op.sequencia).padStart(3, '0')}
                                </span>
                                {/* Status toggle */}
                                <button onClick={() => toggleOpStatus(op)}
                                  style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: `${osc}22`, color: osc, border: `1px solid ${osc}44`, cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.04em', flexShrink: 0 }}>
                                  {opStatusLabels[op.status]}
                                </button>
                                {atrasada && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: '#F44336', fontWeight: 700, fontFamily: 'Barlow Condensed, sans-serif', flexShrink: 0 }}>
                                    ⚠ {diasAtr}d
                                  </span>
                                )}
                                {/* Description */}
                                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F5F5F5', letterSpacing: '0.04em', flex: 1, minWidth: '100px' }}>
                                  {op.descricao}
                                </span>
                                {/* Machine */}
                                {op.maquina_codigo && (
                                  <span style={{ fontSize: '12px', color: '#888', background: '#222', padding: '2px 8px', borderRadius: '4px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.06em' }}>
                                    {op.maquina_codigo}
                                  </span>
                                )}
                                {/* Dados técnicos */}
                                {op.dados_tecnicos && (
                                  <span style={{ fontSize: '11px', color: '#666' }}>{op.dados_tecnicos}</span>
                                )}
                                {/* Data previsão */}
                                {op.data_previsao && (
                                  <span style={{ fontSize: '11px', color: '#555' }}>{fmtDate(op.data_previsao)}</span>
                                )}
                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                                  <button onClick={() => openEditOp(o.id, o.numero, op)}
                                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px' }}>
                                    <Pencil size={12} />
                                  </button>
                                  <button onClick={() => deleteOp(op.id)}
                                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px' }}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Op Modal */}
      {opModal && opModal.op && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '24px', width: '480px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 16px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '17px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5A623' }}>
              {opModal.editId ? 'Editar Operação' : 'Nova Operação'} — OF {opModal.ordemNum}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Sequência *</label>
                <input type="number" value={opModal.op.sequencia} onChange={e => setOpModal(m => m && ({ ...m, op: m.op ? { ...m.op, sequencia: Number(e.target.value) } : m.op }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Fase</label>
                <input type="number" value={opModal.op.fase ?? ''} onChange={e => setOpModal(m => m && ({ ...m, op: m.op ? { ...m.op, fase: e.target.value ? Number(e.target.value) : null } : m.op }))} placeholder="50" style={inp} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Descrição *</label>
                <input value={opModal.op.descricao} onChange={e => setOpModal(m => m && ({ ...m, op: m.op ? { ...m.op, descricao: e.target.value } : m.op }))} placeholder="CORTAR, FURAR, COLAR BORDA..." style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Máquina</label>
                <input value={opModal.op.maquina_codigo ?? ''} onChange={e => setOpModal(m => m && ({ ...m, op: m.op ? { ...m.op, maquina_codigo: e.target.value } : m.op }))} placeholder="SEC01, FUR16, COL10..." style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Grupo</label>
                <input value={opModal.op.grupo ?? ''} onChange={e => setOpModal(m => m && ({ ...m, op: m.op ? { ...m.op, grupo: e.target.value } : m.op }))} placeholder="001" style={inp} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Dados Técnicos</label>
                <input value={opModal.op.dados_tecnicos ?? ''} onChange={e => setOpModal(m => m && ({ ...m, op: m.op ? { ...m.op, dados_tecnicos: e.target.value } : m.op }))} placeholder="1 LD C/605MM, CARIMBAR N 22..." style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Tempo Produção (h)</label>
                <input type="number" step="0.000001" value={opModal.op.tempo_producao ?? ''} onChange={e => setOpModal(m => m && ({ ...m, op: m.op ? { ...m.op, tempo_producao: e.target.value ? Number(e.target.value) : null } : m.op }))} placeholder="0,030000" style={inp} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Previsão do Processo</label>
                <input type="date" value={opModal.op.data_previsao ?? ''} onChange={e => setOpModal(m => m && ({ ...m, op: m.op ? { ...m.op, data_previsao: e.target.value || null } : m.op }))} style={{ ...inp, colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Status</label>
                <select value={opModal.op.status} onChange={e => setOpModal(m => m && ({ ...m, op: m.op ? { ...m.op, status: e.target.value } : m.op }))} style={inp}>
                  <option value="PENDENTE">Pendente</option>
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="CONCLUIDA">Concluída</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setOpModal(null)}
                style={{ flex: 1, padding: '10px', background: '#2A2A2A', border: 'none', borderRadius: '6px', color: '#888', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em' }}>
                Cancelar
              </button>
              <button onClick={saveOp} disabled={opSaving || !opModal.op.descricao}
                style={{ flex: 2, padding: '10px', background: '#F5A623', border: 'none', borderRadius: '6px', color: '#111', cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', opacity: opSaving || !opModal.op.descricao ? 0.6 : 1 }}>
                {opSaving ? 'Salvando...' : 'Salvar Operação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
