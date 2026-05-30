'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X, Zap, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'

export function Navbar() {
  const pathname = usePathname()
  const [cadastrosOpen, setCadastrosOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const cadastrosLinks = [
    { href: '/cadastros/produtos', label: 'Produtos' },
    { href: '/cadastros/funcionarios', label: 'Funcionários' },
    { href: '/cadastros/maquinas', label: 'Máquinas' },
    { href: '/cadastros/ordens', label: 'Ordens de Produção' },
  ]

  const isCadastrosActive = pathname.startsWith('/cadastros')

  const linkStyle = (active: boolean): React.CSSProperties => ({
    display: 'block',
    padding: '10px 16px',
    fontSize: '14px',
    fontFamily: 'Barlow Condensed, sans-serif',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: active ? '#F5A623' : '#888888',
    textDecoration: 'none',
    borderRadius: '4px',
  })

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%', background: '#1C1C1C', borderBottom: '1px solid #2A2A2A' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 16px' }}>
        <div style={{ display: 'flex', height: '52px', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 40" style={{ height: '28px' }}>
              <rect x="10" y="31" width="5" height="8" fill="#2A2A2A" rx="1"/>
              <rect x="18" y="22" width="5" height="17" fill="#F5A623" rx="1"/>
              <rect x="26" y="27" width="5" height="12" fill="#2A2A2A" rx="1"/>
              <rect x="34" y="16" width="5" height="23" fill="#F5A623" rx="1"/>
              <polygon points="36.5,9 42,16 31,16" fill="#F5A623"/>
            </svg>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '18px', letterSpacing: '0.1em', color: '#F5F5F5' }}>
              RITMOPROD
            </span>
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: isMobile ? 'none' : 'flex', alignItems: 'center', gap: '4px' }}>
            <Link href="/" style={linkStyle(pathname === '/')}>Dashboard</Link>
            <Link href="/apontamentos" style={linkStyle(pathname === '/apontamentos')}>Apontamentos</Link>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setCadastrosOpen(!cadastrosOpen)}
                onBlur={() => setTimeout(() => setCadastrosOpen(false), 150)}
                style={{ ...linkStyle(isCadastrosActive), display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Cadastros <ChevronDown size={13} />
              </button>
              {cadastrosOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: '#1C1C1C', border: '1px solid #2A2A2A', borderRadius: '6px', padding: '4px', minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', zIndex: 50 }}>
                  {cadastrosLinks.map(l => (
                    <Link key={l.href} href={l.href} style={linkStyle(pathname === l.href)}>{l.label}</Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/r" style={{ marginLeft: '8px', padding: '6px 12px', fontSize: '13px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: 'transparent', border: '1px solid #F5A623', color: '#F5A623', textDecoration: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={13} /> Rápido
            </Link>
            <Link href="/apontamentos/novo" style={{ marginLeft: '4px', padding: '6px 14px', fontSize: '13px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: '#F5A623', color: '#111111', textDecoration: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Plus size={13} /> Novo Apontamento
            </Link>
          </nav>

          {/* Mobile: botões rápidos + hamburguer */}
          <div style={{ display: isMobile ? 'flex' : 'none', alignItems: 'center', gap: '8px' }}>
            <Link href="/r" style={{ padding: '7px 12px', fontSize: '13px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: 'transparent', border: '1px solid #F5A623', color: '#F5A623', textDecoration: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={13} /> Rápido
            </Link>
            <button
              onClick={() => { setMobileOpen(!mobileOpen); setCadastrosOpen(false) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F5F5F5', padding: '4px' }}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && isMobile && (
        <div style={{ background: '#1C1C1C', borderTop: '1px solid #2A2A2A', padding: '8px 16px 16px' }}>
          <Link href="/" style={linkStyle(pathname === '/')} onClick={() => setMobileOpen(false)}>Dashboard</Link>
          <Link href="/apontamentos" style={linkStyle(pathname === '/apontamentos')} onClick={() => setMobileOpen(false)}>Apontamentos</Link>
          <div style={{ padding: '10px 16px 4px', fontSize: '11px', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>Cadastros</div>
          {cadastrosLinks.map(l => (
            <Link key={l.href} href={l.href} style={{ ...linkStyle(pathname === l.href), paddingLeft: '28px' }} onClick={() => setMobileOpen(false)}>{l.label}</Link>
          ))}
          <div style={{ marginTop: '8px', borderTop: '1px solid #2A2A2A', paddingTop: '8px' }}>
            <Link href="/apontamentos/novo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px', background: '#F5A623', color: '#111', borderRadius: '6px', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, fontSize: '15px', letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>
              <Plus size={16} /> Novo Apontamento
            </Link>
          </div>
        </div>
      )}

    </header>
  )
}
