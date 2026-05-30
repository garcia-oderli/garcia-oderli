'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

export function QrScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const [erro, setErro] = useState('')
  const doneRef = useRef(false)

  useEffect(() => {
    let detector: any = null

    async function start() {
      try {
        // Verifica suporte ao BarcodeDetector (Chrome Android 83+)
        if (!('BarcodeDetector' in window)) {
          setErro('Leitor de QR não suportado neste navegador. Use o Chrome atualizado.')
          return
        }

        // @ts-ignore
        detector = new window.BarcodeDetector({ formats: ['qr_code'] })

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          scanLoop()
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          setErro('Permissão de câmera negada. Toque no ícone de câmera na barra do navegador para permitir.')
        } else {
          setErro('Câmera não disponível: ' + (err.message ?? err))
        }
      }
    }

    function scanLoop() {
      if (doneRef.current || !videoRef.current || !detector) return
      if (videoRef.current.readyState >= 2) {
        detector.detect(videoRef.current).then((results: any[]) => {
          if (results.length > 0 && !doneRef.current) {
            doneRef.current = true
            stop()
            onResult(results[0].rawValue)
          }
        }).catch(() => {})
      }
      rafRef.current = requestAnimationFrame(scanLoop)
    }

    function stop() {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }

    start()
    return () => { doneRef.current = true; stop() }
  }, [])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      background: '#000', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 99999,
    }}>
      {/* Botão fechar */}
      <button onClick={onClose} style={{
        position: 'absolute', top: '16px', right: '16px',
        background: 'rgba(0,0,0,0.6)', border: '1px solid #444',
        borderRadius: '50%', width: '40px', height: '40px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: '#fff', zIndex: 1,
      }}>
        <X size={20} />
      </button>

      {erro ? (
        <div style={{ padding: '24px', maxWidth: '320px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.5)', borderRadius: '12px', padding: '20px', color: '#F44336', fontSize: '14px', lineHeight: '1.5', marginBottom: '16px' }}>
            {erro}
          </div>
          <button onClick={onClose} style={{ background: '#2A2A2A', border: 'none', borderRadius: '8px', padding: '12px 24px', color: '#F5F5F5', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>
            Voltar
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0 }}
          />
          {/* Overlay com mira */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '240px', height: '240px', position: 'relative' }}>
              {/* Cantos da mira */}
              {[
                { top: 0, left: 0, borderTop: '3px solid #F5A623', borderLeft: '3px solid #F5A623' },
                { top: 0, right: 0, borderTop: '3px solid #F5A623', borderRight: '3px solid #F5A623' },
                { bottom: 0, left: 0, borderBottom: '3px solid #F5A623', borderLeft: '3px solid #F5A623' },
                { bottom: 0, right: 0, borderBottom: '3px solid #F5A623', borderRight: '3px solid #F5A623' },
              ].map((style, i) => (
                <div key={i} style={{ position: 'absolute', width: '24px', height: '24px', ...style }} />
              ))}
            </div>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
              APONTE PARA O QR CODE
            </span>
          </div>
        </>
      )}
    </div>
  )
}
