'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

const QR_DIV_ID = 'qr-reader-fixed'

export function QrScanner({ onResult, onClose }: Props) {
  const scannerRef = useRef<any>(null)
  const [erro, setErro] = useState('')
  const resultadoRef = useRef(false)

  useEffect(() => {
    // Pequeno delay para garantir que o div está no DOM
    const timer = setTimeout(() => {
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        const el = document.getElementById(QR_DIV_ID)
        if (!el) { setErro('Erro interno: div não encontrado.'); return }

        const scanner = new Html5Qrcode(QR_DIV_ID)
        scannerRef.current = scanner

        scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          (text: string) => {
            if (resultadoRef.current) return
            resultadoRef.current = true
            scanner.stop().catch(() => {}).finally(() => onResult(text))
          },
          () => {}
        ).catch((err: any) => {
          console.error('QR start error:', err)
          setErro('Não foi possível acessar a câmera. Verifique as permissões do navegador.')
        })
      }).catch(() => setErro('Erro ao carregar o leitor de QR.'))
    }, 300)

    return () => {
      clearTimeout(timer)
      resultadoRef.current = true
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.97)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 99999, padding: '24px',
      boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5A623' }}>
            Escanear QR Code
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F5F5F5', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Div fixo que o scanner vai usar */}
        <div
          id={QR_DIV_ID}
          style={{ borderRadius: '12px', overflow: 'hidden', background: '#111', width: '100%' }}
        />

        {erro ? (
          <div style={{ marginTop: '16px', background: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.4)', borderRadius: '8px', padding: '12px', color: '#F44336', fontSize: '13px', textAlign: 'center' }}>
            {erro}
          </div>
        ) : (
          <p style={{ color: '#555', fontSize: '12px', marginTop: '12px', textAlign: 'center' }}>
            Aponte a câmera para o QR Code da máquina ou crachá
          </p>
        )}

        <button onClick={onClose} style={{ width: '100%', marginTop: '12px', background: '#2A2A2A', border: 'none', borderRadius: '8px', padding: '12px', color: '#F5F5F5', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
