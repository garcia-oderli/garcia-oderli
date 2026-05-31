'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/navbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isTvPanel = /^\/setor\/.+/.test(pathname)

  if (isTvPanel) {
    return (
      <>
        {/* On mobile (≤768px) show navbar; on desktop hide it for fullscreen TV mode */}
        <style>{`
          .tv-navbar { display: none; }
          .tv-content { height: 100vh; overflow: hidden; }
          @media (max-width: 768px) {
            .tv-navbar { display: block; }
            .tv-content { height: calc(100vh - 52px); }
          }
        `}</style>
        <div className="tv-navbar"><Navbar /></div>
        <div className="tv-content">{children}</div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>
        {children}
      </main>
    </>
  )
}
