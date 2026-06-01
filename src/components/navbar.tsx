'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, Menu, X, Zap, Plus, LayoutDashboard, CalendarClock } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function useOverdueCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const supabase = createClient()
    const hoje = new Date().toISOString().slice(0, 10)
    ;(supabase as any)
      .from('ordens_operacoes')
      .select('id', { count: 'exact', head: true })
      .lt('data_previsao', hoje)
      .neq('status', 'CONCLUIDA')
      .then(({ count: c }: any) => setCount(c ?? 0))
  }, [])
  return count
}

export function Navbar() {
  const pathname = usePathname()
  const [cadastrosOpen, setCadastrosOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const overdueCount = useOverdueCount()

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
          <nav className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link href="/" style={linkStyle(pathname === '/')}>Dashboard</Link>
            <Link href="/apontamentos" style={linkStyle(pathname === '/apontamentos')}>Apontamentos</Link>
            <Link href="/setor" style={{ ...linkStyle(pathname === '/setor'), display: 'flex', alignItems: 'center', gap: '4px' }}>
              <LayoutDashboard size={13} /> Setores
            </Link>
            <Link href="/agenda" style={{ ...linkStyle(pathname === '/agenda'), display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
              <CalendarClock size={13} /> Agenda
              {overdueCount > 0 && (
                <span style={{ background: '#F44336', color: '#fff', fontSize: '10px', fontWeight: 700, borderRadius: '10px', padding: '1px 5px', lineHeight: 1.4, letterSpacing: 0 }}>
                  {overdueCount}
                </span>
              )}
            </Link>

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
          <div className="nav-mobile" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
            {overdueCount > 0 && (
              <Link href="/agenda" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: '#2a1212', border: '1px solid #F4433666', borderRadius: '6px', color: '#F44336', textDecoration: 'none' }}>
                <CalendarClock size={16} />
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#F44336', color: '#fff', fontSize: '9px', fontWeight: 700, borderRadius: '8px', padding: '0 4px', lineHeight: '14px' }}>
                  {overdueCount}
                </span>
              </Link>
            )}
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
      {mobileOpen && (
        <div style={{ background: '#1C1C1C', borderTop: '1px solid #2A2A2A', padding: '8px 16px 16px' }}>
          <Link href="/" style={linkStyle(pathname === '/')} onClick={() => setMobileOpen(false)}>Dashboard</Link>
          <Link href="/apontamentos" style={linkStyle(pathname === '/apontamentos')} onClick={() => setMobileOpen(false)}>Apontamentos</Link>
          <Link href="/setor" style={linkStyle(pathname === '/setor')} onClick={() => setMobileOpen(false)}>Setores</Link>
          <Link href="/agenda" style={{ ...linkStyle(pathname === '/agenda'), display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setMobileOpen(false)}>
            Agenda
            {overdueCount > 0 && (
              <span style={{ background: '#F44336', color: '#fff', fontSize: '10px', fontWeight: 700, borderRadius: '10px', padding: '1px 6px' }}>
                {overdueCount}
              </span>
            )}
          </Link>
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

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: flex !important; }
        }
      `}</style>
    </header>
  )
}
