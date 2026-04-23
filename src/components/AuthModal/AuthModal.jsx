import React, { useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import s from './AuthModal.module.css'

const LOGO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"
    strokeLinecap="round" strokeLinejoin="round" width="28" height="28">
    <path d="M12 2C6 2 3 7 3 12c0 3 1.5 5.5 4 7M12 2c6 0 9 5 9 10 0 3-1.5 5.5-4 7M12 2v20M7 7c2 1 4 3 5 5M17 7c-2 1-4 3-5 5"/>
  </svg>
)

const GOOGLE_ICON = (
  <svg viewBox="0 0 24 24" width="20" height="20" style={{flexShrink:0}}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const FEATURES = [
  { icon: '📦', text: 'Усі замовлення та їх статуси' },
  { icon: '🚚', text: 'Збережені адреси доставки' },
  { icon: '★',  text: 'Обране та швидке замовлення' },
  { icon: '🎁', text: 'Бонусні бали та знижки' },
]

export default function AuthModal({ onClose }) {
  const { loginWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', h) }
  }, [onClose])

  const handleGoogle = async () => {
    setError(''); setLoading(true)
    try { await loginWithGoogle(); onClose() }
    catch (e) {
      if (e.code !== 'auth/popup-closed-by-user')
        setError('Помилка входу. Спробуйте ще раз.')
    }
    setLoading(false)
  }

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.sheet}>

        {/* ── LEFT BRAND PANEL ── */}
        <div className={s.brand}>
          <div className={s.brandInner}>
            <div className={s.brandLogo}>{LOGO}</div>
            <h2 className={s.brandName}>Bionerika Agency</h2>
            <p className={s.brandTagline}>Свіжі продукти прямо з теплиці — до вашого столу</p>
            <ul className={s.featureList}>
              {FEATURES.map(f => (
                <li key={f.text} className={s.featureItem}>
                  <span className={s.featureIcon}>{f.icon}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={s.brandDecor} aria-hidden="true">
            <svg viewBox="0 0 200 200" width="280" height="280" opacity=".07">
              <circle cx="100" cy="100" r="80" fill="none" stroke="#fff" strokeWidth="1.5"/>
              <circle cx="100" cy="100" r="55" fill="none" stroke="#fff" strokeWidth="1"/>
              <circle cx="100" cy="100" r="30" fill="none" stroke="#fff" strokeWidth=".8"/>
              <line x1="100" y1="20" x2="100" y2="180" stroke="#fff" strokeWidth=".8"/>
              <line x1="20" y1="100" x2="180" y2="100" stroke="#fff" strokeWidth=".8"/>
            </svg>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className={s.form}>
          <button className={s.closeBtn} onClick={onClose} aria-label="Закрити">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <div className={s.formInner}>
            {/* Mobile-only logo */}
            <div className={s.mobileLogo}>{LOGO}</div>

            <div className={s.badge}>OAuth 2.0 · Безпечно</div>
            <h1 className={s.heading}>Ласкаво просимо!</h1>
            <p className={s.sub}>
              Увійдіть через Google — швидко та безпечно.<br/>
              Ваші замовлення, адреси та бонуси збережуться в хмарі.
            </p>

            <button className={s.googleBtn} onClick={handleGoogle} disabled={loading}>
              {loading
                ? <span className={s.spinner}/>
                : <>{GOOGLE_ICON}<span>Продовжити через Google</span><span className={s.googleBadge}>OAuth 2.0</span></>
              }
            </button>

            {error && <div className={s.error}>⚠️ {error}</div>}

            {/* Mobile features */}
            <ul className={s.mobileFeatures}>
              {FEATURES.map(f => (
                <li key={f.text}><span>{f.icon}</span> {f.text}</li>
              ))}
            </ul>

            <p className={s.privacy}>
              Натискаючи кнопку, ви погоджуєтесь із{' '}
              <a href="#" onClick={e => e.preventDefault()}>Умовами користування</a>{' '}
              та{' '}
              <a href="#" onClick={e => e.preventDefault()}>Політикою конфіденційності</a>.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
