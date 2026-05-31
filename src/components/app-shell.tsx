'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/navbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Setor TV panel: full screen, no navbar, no padding
  const isTvPanel = /^\/setor\/.+/.test(pathname)

  if (isTvPanel) {
    return <>{children}</>
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
