import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Apontamento de Produção',
  description: 'Sistema de apontamento de produção industrial',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
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
