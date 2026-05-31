import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'RitmoProd',
  description: 'Sistema de apontamento de produção industrial',
  icons: { icon: [{ url: '/favicon.png', type: 'image/png' }], shortcut: '/favicon.png', apple: '/favicon.png' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="h-full" style={{ background: '#111111' }}>
      <body className="min-h-full antialiased" style={{ background: '#111111', color: '#F5F5F5' }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
