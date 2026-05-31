'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/navbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // TV panel hides navbar only on desktop (fullscreen mode)
  const isTvPanel = /^\/setor\/.+/.test(pathname)

  if (isTvPanel && !isMobile) {
    return <>{children}</>
  }

  if (isTvPanel && isMobile) {
    return (
      <>
        <Navbar />
        <div style={{ height: 'calc(100vh - 52px)', overflow: 'hidden' }}>{children}</div>
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
