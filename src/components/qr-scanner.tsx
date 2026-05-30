'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

export function QrScanner({ onResult, onClose }: Props) {
  const divId = 'qr-reader-container'
  const scannerRef = useRef<any>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    let mounted = true

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted) return
      const scanner = new Html5Qrcode(divId)
      scannerRef.current = scanner

      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text: string) => {
          scanner.stop().catch(() => {})
          if (mounted) onResult(text)
        },
        () => {}
      ).catch((err: any) => {
        if (mounted) setErro('Câmera não disponível ou sem permissão.')
      })
    })

    return () => {
      mounted = false
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 999, padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '18px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F5A623' }}>
            Escanear QR Code
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}>
            <X size={22} />
          </button>
        </div>

        <div id={divId} style={{ borderRadius: '12px', overflow: 'hidden', background: '#000' }} />

        {erro && (
          <p style={{ color: '#F44336', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>{erro}</p>
        )}

        <p style={{ color: '#555', fontSize: '12px', marginTop: '12px', textAlign: 'center' }}>
          Aponte a câmera para o QR Code da máquina ou crachá
        </p>
      </div>
    </div>
  )
}
