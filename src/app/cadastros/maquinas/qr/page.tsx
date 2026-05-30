'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import QRCode from 'react-qr-code'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function QrMaquinasPage() {
  const [maquinas, setMaquinas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('maquinas')
      .select('id, codigo, descricao, setor')
      .order('codigo')
      .then(({ data }) => {
        setMaquinas(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  return (
    <>
      {/* Barra de ações — some na impressão */}
      <div className="no-print" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/cadastros/maquinas" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#888', textDecoration: 'none', marginBottom: '8px' }}>
            <ArrowLeft size={14} /> Voltar para Máquinas
          </Link>
          <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '28px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5F5F5', margin: 0 }}>
            QR Codes das Máquinas
          </h1>
          <p style={{ color: '#888', fontSize: '13px', marginTop: '4px' }}>
            Imprima e cole em cada máquina. O operador escaneia para apontar.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F5A623', color: '#111', border: 'none', borderRadius: '6px', padding: '10px 20px', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '15px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer' }}
        >
          <Printer size={18} /> Imprimir Todos
        </button>
      </div>

      {/* Grid de QR codes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {maquinas.map(m => (
          <div key={m.id} className="qr-card" style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            breakInside: 'avoid',
          }}>
            {/* Logo RitmoProd */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect width="4" height="24" x="0" y="0" fill="#F5A623" rx="1"/>
                <rect width="4" height="18" x="6" y="6" fill="#F5A623" rx="1"/>
                <rect width="4" height="12" x="12" y="12" fill="#F5A623" rx="1"/>
                <rect width="4" height="8" x="18" y="16" fill="#F5A623" rx="1"/>
              </svg>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', color: '#111' }}>
                RITMOPROD
              </span>
            </div>

            <QRCode
              value={m.codigo}
              size={150}
              bgColor="#ffffff"
              fgColor="#111111"
              level="M"
            />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '18px', color: '#111', letterSpacing: '0.05em' }}>
                {m.codigo}
              </div>
              <div style={{ fontSize: '12px', color: '#444', marginTop: '4px', maxWidth: '160px', lineHeight: '1.3' }}>
                {m.descricao}
              </div>
              {m.setor && (
                <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {m.setor}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CSS de impressão */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .qr-card {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
          }
        }
        @page {
          size: A4;
          margin: 16mm;
        }
      `}</style>
    </>
  )
}
