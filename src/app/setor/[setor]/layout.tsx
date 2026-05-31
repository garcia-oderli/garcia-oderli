'use client'

import { useEffect } from 'react'

export default function SetorTVLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Auto fullscreen on load
    const el = document.documentElement
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#111' }}>
      {children}
    </div>
  )
}
