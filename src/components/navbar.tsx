'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Factory, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const pathname = usePathname()
  const [cadastrosOpen, setCadastrosOpen] = useState(false)

  const navLink = (href: string, label: string) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        style={{
          padding: '6px 12px',
          fontSize: '13px',
          fontFamily: 'Barlow Condensed, sans-serif',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: active ? '#F5A623' : '#888888',
          textDecoration: 'none',
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#F5F5F5' }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#888888' }}
      >
        {label}
      </Link>
    )
  }

  const cadastrosLinks = [
    { href: '/cadastros/produtos', label: 'Produtos' },
    { href: '/cadastros/funcionarios', label: 'Funcionários' },
    { href: '/cadastros/maquinas', label: 'Máquinas' },
    { href: '/cadastros/ordens', label: 'Ordens de Produção' },
  ]

  const isCadastrosActive = pathname.startsWith('/cadastros')

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      width: '100%',
      background: '#1C1C1C',
      borderBottom: '1px solid #2A2A2A',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', height: '56px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 48" style={{ height: '32px', flexShrink: 0 }}>
              <rect width="260" height="1.5" fill="#F5A623" rx="1"/>
              <rect x="10" y="31" width="5" height="8"  fill="#2A2A2A" rx="1"/>
              <rect x="18" y="22" width="5" height="17" fill="#F5A623" rx="1"/>
              <rect x="26" y="27" width="5" height="12" fill="#2A2A2A" rx="1"/>
              <rect x="34" y="16" width="5" height="23" fill="#F5A623" rx="1"/>
              <polygon points="36.5,9 42,16 31,16" fill="#F5A623"/>
              <text x="48" y="32" fontFamily="'Barlow Condensed',sans-serif" fontSize="21" fontWeight="700" fill="#F5F5F5" letterSpacing="2">RITMOPROD</text>
              <text x="49" y="42" fontFamily="'IBM Plex Mono',monospace" fontSize="5.5" fill="#888" letterSpacing="2">ANÁLISE · PRODUÇÃO · RITMO</text>
            </svg>
            <div style={{ borderLeft: '1px solid #2A2A2A', paddingLeft: '14px' }}>
              <div style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#F5F5F5',
                lineHeight: 1.2,
              }}>Apontamento de Produção</div>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '9px',
                color: '#888888',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}>v1</div>
            </div>
          </Link>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navLink('/', 'Dashboard')}
            {navLink('/apontamentos', 'Apontamentos')}

            {/* Cadastros dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setCadastrosOpen(!cadastrosOpen)}
                onBlur={() => setTimeout(() => setCadastrosOpen(false), 150)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: isCadastrosActive ? '#F5A623' : (cadastrosOpen ? '#F5F5F5' : '#888888'),
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                Cadastros
                <ChevronDown style={{ width: '14px', height: '14px' }} />
              </button>

              {cadastrosOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  background: '#1C1C1C',
                  border: '1px solid #2A2A2A',
                  borderRadius: '6px',
                  padding: '4px',
                  minWidth: '200px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  zIndex: 50,
                }}>
                  {cadastrosLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      style={{
                        display: 'block',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontFamily: 'Barlow Condensed, sans-serif',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: pathname === link.href ? '#F5A623' : '#888888',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        transition: 'color 0.15s, background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#F5F5F5'
                        e.currentTarget.style.background = '#222222'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = pathname === link.href ? '#F5A623' : '#888888'
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* CTA Rápido */}
            <Link
              href="/r"
              style={{
                marginLeft: '8px',
                padding: '7px 14px',
                fontSize: '13px',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: 'transparent',
                border: '1px solid #F5A623',
                color: '#F5A623',
                textDecoration: 'none',
                borderRadius: '4px',
              }}
            >
              ⚡ Rápido
            </Link>

            {/* CTA */}
            <Link
              href="/apontamentos/novo"
              style={{
                marginLeft: '8px',
                padding: '7px 16px',
                fontSize: '13px',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: '#F5A623',
                color: '#111111',
                textDecoration: 'none',
                borderRadius: '4px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e09610' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F5A623' }}
            >
              + Novo Apontamento
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
