'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, ChevronRight, AlertCircle, RotateCcw, Settings, QrCode } from 'lucide-react'
import Link from 'next/link'
import { QrScanner } from '@/components/qr-scanner'

type Etapa = 'maquina' | 'matricula' | 'op' | 'qtd' | 'ok'

function getTurnoAtual(): 'MANHA' | 'TARDE' | 'NOITE' {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'MANHA'
  if (h >= 14 && h < 22) return 'TARDE'
  return 'NOITE'
}

function getTurnoLabel(t: string) {
  if (t === 'MANHA') return 'Manhã'
  if (t === 'TARDE') return 'Tarde'
  return 'Noite'
}

export default function ApontamentoRapido() {
  const [etapa, setEtapa] = useState<Etapa>('maquina')
  const [maquinas, setMaquinas] = useState<any[]>([])
  const [maquinaId, setMaquinaId] = useState('')
  const [maquinaCodigo, setMaquinaCodigo] = useState('')
  const [matricula, setMatricula] = useState('')
  const [funcionario, setFuncionario] = useState<any>(null)
  const [ordens, setOrdens] = useState<any[]>([])
  const [ordemId, setOrdemId] = useState('')
  const [ordem, setOrdem] = useState<any>(null)
  const [saldo, setSaldo] = useState<number>(0)
  const [qtdProduzida, setQtdProduzida] = useState('')
  const [qtdRefugo, setQtdRefugo] = useState('0')
  const [qtdRetrabalho, setQtdRetrabalho] = useState('0')
  const [turno] = useState(getTurnoAtual())
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mostrarManual, setMostrarManual] = useState(false)
  const [qrAtivo, setQrAtivo] = useState(false)
  const [qrAlvo, setQrAlvo] = useState<'maquina' | 'matricula'>('maquina')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    createClient().from('maquinas').select('id, codigo, descricao, setor').order('codigo').then(({ data }) => {
      setMaquinas(data ?? [])
    })
  }, [])

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [etapa])

  const confirmarMaquina = (id: string, codigo: string) => {
    setMaquinaId(id)
    setMaquinaCodigo(codigo)
    setErro('')
    setEtapa('matricula')
  }

  const confirmarMatricula = async (mat?: string) => {
    setErro('')
    const valor = (mat ?? matricula).trim()
    if (!valor) return
    const { data } = await createClient().from('funcionarios').select('id, nome, matricula, setor').eq('matricula', valor).single()
    if (!data) { setErro('Matrícula não encontrada.'); return }
    setFuncionario(data)

    // Busca OPs abertas + saldo
    const supabase = createClient()
    const { data: ops } = await supabase
      .from('ordens_producao')
      .select('id, numero, quantidade_planejada, produto_id, produtos(codigo, descricao, unidade_medida)')
      .in('status', ['ABERTA', 'EM_ANDAMENTO'])
      .order('numero')

    // Calcula saldo de cada OP
    const opsComSaldo = await Promise.all((ops ?? []).map(async (op: any) => {
      const { data: apts } = await supabase.from('apontamentos')
        .select('quantidade_produzida, quantidade_refugo, quantidade_retrabalho')
        .eq('ordem_producao_id', op.id)
      const total = (apts ?? []).reduce((acc: number, a: any) =>
        acc + Number(a.quantidade_produzida) + Number(a.quantidade_refugo) + Number(a.quantidade_retrabalho), 0)
      return { ...op, saldo: Number(op.quantidade_planejada) - total }
    }))

    setOrdens(opsComSaldo.filter((o: any) => o.saldo > 0))
    setEtapa('op')
  }

  const selecionarOP = (op: any) => {
    setOrdemId(op.id)
    setOrdem(op)
    setSaldo(op.saldo)
    setEtapa('qtd')
    setErro('')
  }

  const confirmarQtd = async () => {
    const prod = Number(qtdProduzida)
    const ref = Number(qtdRefugo) || 0
    const ret = Number(qtdRetrabalho) || 0
    if (!prod && prod !== 0) { setErro('Informe a quantidade.'); return }
    if (prod + ref + ret > saldo) { setErro(`Saldo disponível: ${saldo}`); return }
    if (prod + ref + ret <= 0) { setErro('Total deve ser maior que zero.'); return }

    setSalvando(true)
    setErro('')

    const { data: result, error: rpcError } = await (createClient() as any).rpc('registrar_apontamento', {
      p_ordem_producao_id: ordemId,
      p_produto_id: ordem.produto_id,
      p_funcionario_id: funcionario.id,
      p_maquina_id: maquinaId,
      p_quantidade_produzida: prod,
      p_quantidade_refugo: ref,
      p_quantidade_retrabalho: ret,
      p_data_inicio: new Date().toISOString(),
      p_data_fim: new Date().toISOString(),
      p_turno: turno,
      p_observacoes: null,
    })

    setSalvando(false)

    if (rpcError) { setErro(rpcError.message); return }
    const res = result as any
    if (!res.ok) { setErro(res.erro ?? 'Erro ao salvar.'); return }

    setEtapa('ok')
  }

  const abrirQr = (alvo: 'maquina' | 'matricula') => {
    setQrAlvo(alvo)
    setQrAtivo(true)
  }

  const handleQrResult = async (texto: string) => {
    setQrAtivo(false)
    setErro('')

    if (qrAlvo === 'maquina') {
      // QR da máquina contém o código ex: "MAQ-001"
      const maq = maquinas.find(m => m.codigo === texto.trim())
      if (maq) {
        confirmarMaquina(maq.id, maq.codigo)
      } else {
        setErro(`Máquina "${texto}" não encontrada.`)
      }
    } else {
      // QR do crachá contém a matrícula
      setMatricula(texto.trim())
      confirmarMatricula(texto.trim())
    }
  }

  const reiniciar = () => {
    setEtapa('maquina')
    setMaquinaId('')
    setMaquinaCodigo('')
    setMatricula('')
    setFuncionario(null)
    setOrdens([])
    setOrdemId('')
    setOrdem(null)
    setSaldo(0)
    setQtdProduzida('')
    setQtdRefugo('0')
    setQtdRetrabalho('0')
    setErro('')
    setMostrarManual(false)
  }

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: '#111111', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', fontFamily: 'Barlow Condensed, sans-serif' },
    card: { width: '100%', maxWidth: '420px', background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '12px', padding: '28px 24px' },
    title: { fontSize: '22px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#F5A623', margin: '0 0 4px 0' },
    sub: { fontSize: '13px', color: '#888888', margin: '0 0 24px 0' },
    label: { fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#888888', display: 'block', marginBottom: '8px' },
    input: { width: '100%', background: '#111111', border: '1px solid #2A2A2A', borderRadius: '8px', color: '#F5F5F5', fontSize: '28px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, padding: '14px 16px', outline: 'none', boxSizing: 'border-box' as const, textAlign: 'center' as const },
    btn: { width: '100%', background: '#F5A623', color: '#111111', border: 'none', borderRadius: '8px', padding: '16px', fontSize: '18px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, cursor: 'pointer', marginTop: '16px' },
    btnSecondary: { width: '100%', background: '#2A2A2A', color: '#F5F5F5', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' },
    erro: { background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.4)', borderRadius: '8px', color: '#F44336', fontSize: '13px', padding: '10px 14px', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' },
    chip: { display: 'inline-block', background: '#222222', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', color: '#888888', marginBottom: '16px' },
    opCard: { background: '#111111', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '14px 16px', marginBottom: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    maqCard: { background: '#111111', border: '1px solid #2A2A2A', borderRadius: '8px', padding: '14px 16px', marginBottom: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  }

  // Contexto do turno no topo
  const topBar = (
    <div style={{ width: '100%', maxWidth: '420px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <span style={{ fontSize: '13px', color: '#888888' }}>
        Turno: <strong style={{ color: '#F5A623' }}>{getTurnoLabel(turno)}</strong>
      </span>
      <Link href="/apontamentos/novo" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#555', textDecoration: 'none' }}>
        <Settings size={13} /> Formulário completo
      </Link>
    </div>
  )

  // ETAPA: SUCESSO
  if (etapa === 'ok') return (
    <div style={s.page}>
      {topBar}
      <div style={{ ...s.card, textAlign: 'center' }}>
        <CheckCircle2 size={64} style={{ color: '#4CAF50', margin: '0 auto 16px' }} />
        <h2 style={{ ...s.title, color: '#4CAF50', textAlign: 'center' }}>Registrado!</h2>
        <p style={{ color: '#888888', fontSize: '14px', margin: '8px 0 24px' }}>
          {ordem?.numero} · {qtdProduzida} {ordem?.produtos?.unidade_medida}
        </p>
        <button style={s.btn} onClick={reiniciar}>Novo Apontamento</button>
      </div>
    </div>
  )

  // ETAPA: MÁQUINA
  if (etapa === 'maquina') return (
    <div style={s.page}>
      {qrAtivo && <QrScanner onResult={handleQrResult} onClose={() => setQrAtivo(false)} />}
      {topBar}
      <div style={s.card}>
        <h2 style={s.title}>Qual máquina?</h2>
        <p style={s.sub}>Escaneie o QR ou toque na lista</p>
        <button style={{ ...s.btn, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px', marginTop: 0 }}
          onClick={() => abrirQr('maquina')}>
          <QrCode size={20} /> Escanear QR da Máquina
        </button>
        {erro && <div style={s.erro}><AlertCircle size={14} />{erro}</div>}
        <div style={{ maxHeight: '45vh', overflowY: 'auto' }}>
          {maquinas.map(m => (
            <div key={m.id} style={s.maqCard} onClick={() => confirmarMaquina(m.id, m.codigo)}>
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#F5A623', fontSize: '16px' }}>{m.codigo}</div>
                <div style={{ fontSize: '13px', color: '#888888' }}>{m.descricao}</div>
              </div>
              <ChevronRight size={18} style={{ color: '#555' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ETAPA: MATRÍCULA
  if (etapa === 'matricula') return (
    <div style={s.page}>
      {qrAtivo && <QrScanner onResult={handleQrResult} onClose={() => setQrAtivo(false)} />}
      {topBar}
      <div style={s.card}>
        <span style={s.chip}>{maquinaCodigo}</span>
        <h2 style={s.title}>Sua matrícula</h2>
        <p style={s.sub}>Escaneie o crachá ou digite a matrícula</p>
        <button style={{ ...s.btn, background: '#1C2A1C', border: '1px solid #4CAF50', color: '#4CAF50', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}
          onClick={() => abrirQr('matricula')}>
          <QrCode size={18} /> Escanear Crachá
        </button>
        <label style={s.label}>Ou digite a matrícula</label>
        <input
          ref={inputRef}
          style={s.input}
          type="text"
          inputMode="numeric"
          value={matricula}
          onChange={e => setMatricula(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirmarMatricula()}
          placeholder="0000"
          autoComplete="off"
        />
        {erro && <div style={s.erro}><AlertCircle size={14} />{erro}</div>}
        <button style={s.btn} onClick={() => confirmarMatricula()}>Confirmar</button>
        <button style={s.btnSecondary} onClick={() => setEtapa('maquina')}>← Voltar</button>
      </div>
    </div>
  )

  // ETAPA: OP
  if (etapa === 'op') return (
    <div style={s.page}>
      {topBar}
      <div style={s.card}>
        <span style={s.chip}>{maquinaCodigo} · {funcionario?.nome?.split(' ')[0]}</span>
        <h2 style={s.title}>Qual OP?</h2>
        <p style={s.sub}>Ordens abertas com saldo disponível</p>
        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {ordens.length === 0 && (
            <p style={{ color: '#888888', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>Nenhuma OP aberta com saldo.</p>
          )}
          {ordens.map(op => (
            <div key={op.id} style={s.opCard} onClick={() => selecionarOP(op)}>
              <div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#F5A623', fontSize: '16px' }}>{op.numero}</div>
                <div style={{ fontSize: '12px', color: '#888888' }}>{op.produtos?.descricao}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '14px', color: '#4CAF50', fontWeight: 700 }}>{op.saldo}</div>
                <div style={{ fontSize: '10px', color: '#555' }}>{op.produtos?.unidade_medida}</div>
              </div>
            </div>
          ))}
        </div>
        <button style={s.btnSecondary} onClick={() => setEtapa('matricula')}>← Voltar</button>
      </div>
    </div>
  )

  // ETAPA: QUANTIDADE
  if (etapa === 'qtd') return (
    <div style={s.page}>
      {topBar}
      <div style={s.card}>
        <span style={s.chip}>{ordem?.numero} · saldo {saldo} {ordem?.produtos?.unidade_medida}</span>
        <h2 style={s.title}>Quantidade</h2>
        <p style={s.sub}>{ordem?.produtos?.descricao}</p>

        <label style={s.label}>Produzido (boas)</label>
        <input
          ref={inputRef}
          style={s.input}
          type="number"
          inputMode="numeric"
          min="0"
          value={qtdProduzida}
          onChange={e => setQtdProduzida(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && confirmarQtd()}
          placeholder="0"
        />

        {!mostrarManual ? (
          <button style={{ ...s.btnSecondary, marginTop: '16px', fontSize: '12px', color: '#555' }}
            onClick={() => setMostrarManual(true)}>
            + Refugo / Retrabalho
          </button>
        ) : (
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ ...s.label, color: '#F44336' }}>Refugo</label>
              <input style={{ ...s.input, fontSize: '22px', borderColor: 'rgba(244,67,54,0.4)' }}
                type="number" inputMode="numeric" min="0"
                value={qtdRefugo} onChange={e => setQtdRefugo(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={{ ...s.label, color: '#FF9800' }}>Retrabalho</label>
              <input style={{ ...s.input, fontSize: '22px', borderColor: 'rgba(255,152,0,0.4)' }}
                type="number" inputMode="numeric" min="0"
                value={qtdRetrabalho} onChange={e => setQtdRetrabalho(e.target.value)} placeholder="0" />
            </div>
          </div>
        )}

        {erro && <div style={s.erro}><AlertCircle size={14} />{erro}</div>}

        <button style={{ ...s.btn, opacity: salvando ? 0.6 : 1 }} onClick={confirmarQtd} disabled={salvando}>
          {salvando ? 'Salvando...' : 'Registrar'}
        </button>
        <button style={s.btnSecondary} onClick={() => setEtapa('op')}>← Voltar</button>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link href="/apontamentos/novo" style={{ fontSize: '11px', color: '#444', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <RotateCcw size={11} /> Usar formulário completo
          </Link>
        </div>
      </div>
    </div>
  )

  return null
}
