import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/navbar'

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
        <Navbar />
        <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>{children}</main>
      </body>
    </html>
  )
}
