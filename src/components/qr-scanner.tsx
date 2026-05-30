'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

export function QrScanner({ onResult, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<any>(null)
  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    const divId = 'qr-scan-' + Math.random().toString(36).slice(2)
    if (!containerRef.current) return

    // Cria o div dentro do container
    const div = document.createElement('div')
    div.id = divId
    containerRef.current.appendChild(div)
    setPronto(true)

    let stopped = false

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return
      try {
        const scanner = new Html5Qrcode(divId)
        scannerRef.current = scanner

        scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text: string) => {
            stopped = true
            scanner.stop().catch(() => {}).finally(() => {
              onResult(text)
            })
          },
          () => {}
        ).catch(() => {
          if (!stopped) setErro('Câmera não disponível. Verifique as permissões.')
        })
      } catch {
        setErro('Erro ao iniciar o leitor de QR.')
      }
    }).catch(() => {
      setErro('Erro ao carregar o leitor.')
    })

    return () => {
      stopped = true
      scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.95)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '24px',
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

        <div
          ref={containerRef}
          style={{ borderRadius: '12px', overflow: 'hidden', background: '#000', minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {!pronto && <span style={{ color: '#888', fontSize: '13px' }}>Iniciando câmera...</span>}
        </div>

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
