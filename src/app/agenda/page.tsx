'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarClock, AlertTriangle, CheckCircle2, Clock, RefreshCw, Bell, BellOff } from 'lucide-react'
import Link from 'next/link'

interface OpAgenda {
  id: string
  ordem_id: string
  sequencia: number
  descricao: string
  maquina_codigo: string | null
  dados_tecnicos: string | null
  data_previsao: string
  status: string
  of_numero: string
  of_lote: string | null
  produto_descricao: string | null
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(s: string) {
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function diasAtraso(data: string): number {
  const d = new Date(data + 'T12:00:00')
  const h = new Date()
  h.setHours(0, 0, 0, 0)
  return Math.floor((h.getTime() - d.getTime()) / 86400000)
}

const opStatusColors: Record<string, string> = {
  PENDENTE: '#555',
  EM_ANDAMENTO: '#F5A623',
  CONCLUIDA: '#4CAF50',
}

export default function AgendaPage() {
  const [ops, setOps] = useState<OpAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>('default')
  const [filtro, setFiltro] = useState<'todos' | 'atrasadas' | 'hoje' | 'proximos'>('todos')

  const fetchOps = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    // Get all non-concluded ops with a data_previsao in the next 14 days or already past
    const limite = new Date()
    limite.setDate(limite.getDate() + 14)
    const { data } = await (supabase as any)
      .from('ordens_operacoes')
      .select(`
        id, ordem_id, sequencia, descricao, maquina_codigo, dados_tecnicos, data_previsao, status,
        ordens_producao(numero, lote, produtos(descricao))
      `)
      .lte('data_previsao', limite.toISOString().slice(0, 10))
      .neq('status', 'CONCLUIDA')
      .order('data_previsao')

    const rows: OpAgenda[] = (data ?? []).map((r: any) => ({
      id: r.id,
      ordem_id: r.ordem_id,
      sequencia: r.sequencia,
      descricao: r.descricao,
      maquina_codigo: r.maquina_codigo,
      dados_tecnicos: r.dados_tecnicos,
      data_previsao: r.data_previsao,
      status: r.status,
      of_numero: r.ordens_producao?.numero ?? '—',
      of_lote: r.ordens_producao?.lote ?? null,
      produto_descricao: r.ordens_producao?.produtos?.descricao ?? null,
    }))
    setOps(rows)
    setLoading(false)
  }, [])

  useEffect(() => { fetchOps() }, [fetchOps])

  useEffect(() => {
    if (typeof Notification === 'undefined') { setNotifPerm('unsupported'); return }
    setNotifPerm(Notification.permission)
  }, [])

  // Fire browser notification for overdue ops
  useEffect(() => {
    if (notifPerm !== 'granted') return
    const atrasadas = ops.filter(o => diasAtraso(o.data_previsao) > 0)
    if (atrasadas.length === 0) return
    const n = new Notification('RitmoProd — Operações Atrasadas', {
      body: `${atrasadas.length} operação(ões) com prazo vencido.`,
      icon: '/favicon.png',
      tag: 'ritmoprod-atrasadas',
    })
    n.onclick = () => window.focus()
  }, [ops, notifPerm])

  const requestNotif = async () => {
    if (typeof Notification === 'undefined') return
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
  }

  const toggleStatus = async (op: OpAgenda) => {
    const next = op.status === 'PENDENTE' ? 'EM_ANDAMENTO' : op.status === 'EM_ANDAMENTO' ? 'CONCLUIDA' : 'PENDENTE'
    const supabase = createClient()
    await (supabase as any).from('ordens_operacoes').update({ status: next }).eq('id', op.id)
    fetchOps()
  }

  const todayStr = hoje()
  const atrasadas = ops.filter(o => o.data_previsao < todayStr)
  const hoje_ops = ops.filter(o => o.data_previsao === todayStr)
  const proximos = ops.filter(o => o.data_previsao > todayStr)

  const filtered = filtro === 'atrasadas' ? atrasadas
    : filtro === 'hoje' ? hoje_ops
    : filtro === 'proximos' ? proximos
    : ops

  // Group by machine for filtered view
  const byMaquina: Record<string, OpAgenda[]> = {}
  for (const op of filtered) {
    const key = op.maquina_codigo ?? 'SEM MÁQUINA'
    if (!byMaquina[key]) byMaquina[key] = []
    byMaquina[key].push(op)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '28px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5F5F5', margin: 0 }}>
            AGENDA DE OPERAÇÕES
          </h1>
          <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
            {fmtDate(todayStr)} · operações pendentes nos próximos 14 dias
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notifPerm === 'default' && (
            <button onClick={requestNotif}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: '#1A2030', border: '1px solid #2A4A6A', borderRadius: '6px', color: '#4A9EDF', fontSize: '12px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}>
              <Bell size={13} /> Ativar notificações
            </button>
          )}
          {notifPerm === 'granted' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#4CAF50' }}>
              <Bell size={13} /> Notificações ativas
            </span>
          )}
          {notifPerm === 'denied' && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#555' }}>
              <BellOff size={13} /> Notificações bloqueadas
            </span>
          )}
          <button onClick={fetchOps} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '6px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
        {[
          { label: 'Atrasadas', value: atrasadas.length, color: '#F44336', icon: <AlertTriangle size={18} />, key: 'atrasadas' },
          { label: 'Para Hoje', value: hoje_ops.length, color: '#F5A623', icon: <Clock size={18} />, key: 'hoje' },
          { label: 'Próximos 14d', value: proximos.length, color: '#4A9EDF', icon: <CalendarClock size={18} />, key: 'proximos' },
          { label: 'Total Pendente', value: ops.length, color: '#888', icon: <CheckCircle2 size={18} />, key: 'todos' },
        ].map(card => (
          <button key={card.key} onClick={() => setFiltro(card.key as any)}
            style={{ background: filtro === card.key ? `${card.color}22` : '#1C1C1C', border: `1px solid ${filtro === card.key ? card.color + '66' : '#2A2A2A'}`, borderRadius: '8px', padding: '14px 16px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#666' }}>{card.label}</span>
              <span style={{ color: card.color }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color, fontFamily: 'Barlow Condensed, sans-serif', lineHeight: 1 }}>{card.value}</div>
          </button>
        ))}
      </div>

      {/* Alert banner for overdue */}
      {atrasadas.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: '#2a1212', border: '1px solid #F4433666', borderRadius: '8px' }}>
          <AlertTriangle size={16} style={{ color: '#F44336', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#F44336', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.04em' }}>
            {atrasadas.length} operação{atrasadas.length > 1 ? 'ões' : ''} com prazo vencido — requer atenção imediata
          </span>
        </div>
      )}

      {/* Op list grouped by machine */}
      {loading ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '48px' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: '#555', textAlign: 'center', padding: '48px', fontSize: '14px' }}>
          {filtro === 'atrasadas' ? 'Nenhuma operação atrasada. ' : 'Nenhuma operação para este período.'}
          {filtro === 'atrasadas' && <span style={{ color: '#4CAF50' }}>✓ Tudo em dia!</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(byMaquina).sort(([a], [b]) => a.localeCompare(b)).map(([maq, maqOps]) => {
            const temAtrasada = maqOps.some(o => o.data_previsao < todayStr)
            return (
              <div key={maq} style={{ background: '#1C1C1C', border: `1px solid ${temAtrasada ? '#F4433644' : '#2A2A2A'}`, borderRadius: '10px', overflow: 'hidden' }}>
                {/* Machine header */}
                <div style={{ padding: '10px 16px', background: temAtrasada ? '#2a1818' : '#181818', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '16px', letterSpacing: '0.08em', color: temAtrasada ? '#F44336' : '#888' }}>
                    {maq}
                  </span>
                  {temAtrasada && <AlertTriangle size={13} style={{ color: '#F44336' }} />}
                  <span style={{ fontSize: '11px', color: '#444', marginLeft: 'auto' }}>{maqOps.length} op{maqOps.length > 1 ? 's' : ''}</span>
                </div>
                {/* Ops */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {maqOps.map((op, i) => {
                    const atraso = diasAtraso(op.data_previsao)
                    const isAtrasada = atraso > 0
                    const isHoje = op.data_previsao === todayStr
                    const dateColor = isAtrasada ? '#F44336' : isHoje ? '#F5A623' : '#4A9EDF'

                    return (
                      <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: i < maqOps.length - 1 ? '1px solid #1A1A1A' : undefined, flexWrap: 'wrap', background: isAtrasada ? '#1E1212' : 'transparent' }}>
                        {/* Seq */}
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '12px', color: '#444', minWidth: '28px' }}>
                          {String(op.sequencia).padStart(3, '0')}
                        </span>

                        {/* Status toggle */}
                        <button onClick={() => toggleStatus(op)}
                          style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: `${opStatusColors[op.status]}22`, color: opStatusColors[op.status], border: `1px solid ${opStatusColors[op.status]}44`, cursor: 'pointer', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.04em', flexShrink: 0 }}>
                          {op.status === 'PENDENTE' ? 'PENDENTE' : op.status === 'EM_ANDAMENTO' ? 'EM AND.' : 'CONCLUÍDA'}
                        </button>

                        {/* Description */}
                        <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '14px', color: '#F5F5F5', flex: 1, minWidth: '100px' }}>
                          {op.descricao}
                        </span>

                        {/* OF link */}
                        <Link href="/cadastros/ordens" style={{ fontSize: '12px', color: '#F5A623', textDecoration: 'none', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, flexShrink: 0 }}>
                          OF {op.of_numero}
                        </Link>

                        {/* Product */}
                        {op.produto_descricao && (
                          <span style={{ fontSize: '11px', color: '#555', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {op.produto_descricao}
                          </span>
                        )}

                        {/* Date */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: dateColor, fontFamily: 'Barlow Condensed, sans-serif' }}>
                            {isHoje ? 'HOJE' : fmtDate(op.data_previsao)}
                          </div>
                          {isAtrasada && (
                            <div style={{ fontSize: '10px', color: '#F44336', letterSpacing: '0.04em' }}>
                              {atraso}d de atraso
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
