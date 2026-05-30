'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'react-qr-code'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function QrFuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('funcionarios')
      .select('id, matricula, nome, setor')
      .order('nome')
      .then(({ data }) => {
        setFuncionarios(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  return (
    <>
      <div className="no-print" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/cadastros/funcionarios" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#888', textDecoration: 'none', marginBottom: '8px' }}>
            <ArrowLeft size={14} /> Voltar para Funcionários
          </Link>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '28px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5F5F5', margin: 0 }}>
            Crachás QR Code
          </h1>
          <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
            Imprima e entregue para cada funcionário. O operador escaneia para se identificar.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F5A623', color: '#111', border: 'none', borderRadius: '6px', padding: '10px 20px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '15px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          <Printer size={18} /> Imprimir Todos
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
        {funcionarios.map(f => (
          <div key={f.id} className="qr-card" style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            breakInside: 'avoid',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect width="4" height="24" x="0" y="0" fill="#F5A623" rx="1"/>
                <rect width="4" height="18" x="6" y="6" fill="#F5A623" rx="1"/>
                <rect width="4" height="12" x="12" y="12" fill="#F5A623" rx="1"/>
                <rect width="4" height="8" x="18" y="16" fill="#F5A623" rx="1"/>
              </svg>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '12px', letterSpacing: '0.1em', color: '#111' }}>
                RITMOPROD
              </span>
            </div>

            <QRCode
              value={f.matricula}
              size={130}
              bgColor="#ffffff"
              fgColor="#111111"
              level="M"
            />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: '#111', letterSpacing: '0.05em' }}>
                {f.matricula}
              </div>
              <div style={{ fontSize: '13px', color: '#222', marginTop: '4px', fontWeight: 600, maxWidth: '150px', lineHeight: '1.3' }}>
                {f.nome}
              </div>
              {f.setor && (
                <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {f.setor}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .qr-card { border: 1px solid #ddd !important; }
        }
        @page { size: A4; margin: 16mm; }
      `}</style>
    </>
  )
}
