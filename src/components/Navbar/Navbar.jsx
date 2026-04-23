import React, { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useLang, LANGS } from '../../i18n/LangContext.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useTheme } from '../../contexts/ThemeContext.jsx'
import AuthModal from '../AuthModal/AuthModal.jsx'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { t, lang, setLang } = useLang()
  const { user, profile, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [scrolled,    setScrolled]   = useState(false)
  const [mobileOpen,  setMobileOpen] = useState(false)
  const [showAuth,    setShowAuth]   = useState(false)
  const [userMenuOpen,setUserMenuOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return
    const h = e => {
      if (!e.target.closest('[data-usermenu]')) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [userMenuOpen])

  const links = [
    { to: '/',        label: t.nav_home    },
    { to: '/catalog', label: t.nav_catalog },
    { to: '/order',   label: t.nav_order   },
    { to: '/about',   label: t.nav_about   },
    { to: '/contact', label: t.nav_contact },
  ]

  const initials = (profile?.name || user?.displayName || user?.email || '?')
    .split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()

  return (
    <>
      <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
        <div className={styles.inner}>
          <Link to="/" className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#8fba8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C6 2 3 7 3 12c0 3 1.5 5.5 4 7M12 2c6 0 9 5 9 10 0 3-1.5 5.5-4 7M12 2v20M7 7c2 1 4 3 5 5M17 7c-2 1-4 3-5 5" />
              </svg>
            </div>
            <span style={{ fontFamily:'var(--serif,Cormorant Garamond)', fontSize:20, fontWeight:600, letterSpacing:'.01em' }}>Bionerika</span>
          </Link>

          <ul className={styles.links}>
            {links.map(({ to, label }) => (
              <li key={to}>
                <NavLink to={to} end={to === '/'}
                  className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className={styles.right}>
            <div className={styles.themeSwitch}>
              <button
                className={`${styles.themeBtn} ${theme === 'light' ? styles.themeActive : ''}`}
                onClick={() => theme !== 'light' && toggleTheme()}
                aria-label="Светлая тема"
                title="Светлая тема"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                <span>День</span>
              </button>
              <button
                className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeActive : ''}`}
                onClick={() => theme !== 'dark' && toggleTheme()}
                aria-label="Тёмная тема"
                title="Тёмная тема"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                <span>Ночь</span>
              </button>
            </div>
            <div className={styles.langSwitch}>
              {LANGS.map(l => (
                <button key={l.code}
                  className={`${styles.langBtn} ${lang === l.code ? styles.langActive : ''}`}
                  onClick={() => setLang(l.code)}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>

            {/* Auth button */}
            {user ? (
              <div className={styles.userWrap} data-usermenu>
                <button
                  className={styles.userBtn}
                  onClick={() => setUserMenuOpen(o => !o)}
                  data-usermenu
                >
                  <div className={styles.userAvatar}>{initials}</div>
                  <span className={styles.userName}>{profile?.name?.split(' ')[0] || 'Профіль'}</span>
                  <svg className={styles.userChevron} style={{transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition:'transform .3s cubic-bezier(.4,0,.2,1)'}} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {userMenuOpen && (
                  <div className={styles.userMenu} data-usermenu>
                    <Link to="/profile" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      {t.nav_profile || 'Особистий кабінет'}
                    </Link>
                    <Link to="/profile" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}
                      state={{ tab: 'orders' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                      {t.nav_orders || 'Мої замовлення'}
                    </Link>
                    <Link to="/profile" className={styles.userMenuItem} onClick={() => setUserMenuOpen(false)}
                      state={{ tab: 'reviews' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{flexShrink:0}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      {t.nav_my_reviews || 'Мої відгуки'}
                    </Link>
                    <div className={styles.userMenuDivider}/>
                    <button className={`${styles.userMenuItem} ${styles.userMenuLogout}`} onClick={() => { logout(); setUserMenuOpen(false) }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      {t.profile_logout || 'Вийти'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className={styles.authBtn} onClick={() => setShowAuth(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {t.nav_login || 'Войти'}
              </button>
            )}

            <Link to="/order" className={styles.cta}>{t.nav_cta}</Link>
          </div>

          <button className={styles.hamburger} onClick={() => setMobileOpen(o => !o)} aria-label="menu">
            <span className={mobileOpen ? styles.open1 : ''} />
            <span className={mobileOpen ? styles.open2 : ''} />
            <span className={mobileOpen ? styles.open3 : ''} />
          </button>
        </div>
      </nav>

      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.mobileOpen : ''}`}>
        <button className={styles.closeBtn} onClick={() => setMobileOpen(false)}>✕</button>
        <div className={styles.mobileLang}>
          {LANGS.map(l => (
            <button key={l.code}
              className={`${styles.langBtn} ${lang === l.code ? styles.langActive : ''}`}
              onClick={() => { setLang(l.code); setMobileOpen(false) }}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={styles.mobileLink} onClick={() => setMobileOpen(false)}>{label}</NavLink>
        ))}
        {user ? (
          <>
          <Link to="/profile" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginRight:6}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {t.nav_profile || 'Особистий кабінет'}
          </Link>
          <button className={`${styles.mobileLink} ${styles.mobileLogout}`} onClick={() => { logout(); setMobileOpen(false) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',marginRight:6}}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            {t.profile_logout || 'Вийти'}
          </button>
          </>
        ) : (
          <button className={`btn-primary ${styles.mobileCta}`} onClick={() => { setShowAuth(true); setMobileOpen(false) }}>
            {t.nav_login || 'Войти'}
          </button>
        )}
        <Link to="/order" className={`btn-primary ${styles.mobileCta}`} onClick={() => setMobileOpen(false)}>{t.nav_cta}</Link>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
