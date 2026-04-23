import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import Icon from '../Icon/Icon.jsx'
import styles from './Footer.module.css'

export default function Footer() {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const handleSub = () => { if (email.trim()) { setSubscribed(true); setEmail('') } }

  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.inner}>

          <div className={styles.brand}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <Icon name="leaf" size={20} color="#8fba8f" strokeWidth={2} />
              </div>
              Bionerika Agency
            </div>
            <p className={styles.desc}>{t.foot_desc}</p>
            <div className={styles.socials}>
              {[
                { name:'facebook',  href:'#' },
                { name:'instagram', href:'#' },
                { name:'youtube',   href:'#' },
                { name:'telegram',  href:'#' },
              ].map(({ name, href }) => (
                <a key={name} href={href} className={styles.social} aria-label={name}>
                  <Icon name={name} size={16} strokeWidth={1.8} />
                </a>
              ))}
            </div>
          </div>

          <div className={styles.col}>
            <h4 className={styles.colTitle}>{t.foot_company}</h4>
            <ul className={styles.colList}>
              <li><Link to="/about"><Icon name="about" size={13} strokeWidth={2}/>{t.nav_about}</Link></li>
              <li><Link to="/catalog"><Icon name="catalog" size={13} strokeWidth={2}/>{t.nav_catalog}</Link></li>
              <li><Link to="/contact"><Icon name="contact" size={13} strokeWidth={2}/>{t.nav_contact}</Link></li>
            </ul>
          </div>

          <div className={styles.col}>
            <h4 className={styles.colTitle}>{t.foot_links}</h4>
            <ul className={styles.colList}>
              <li><Link to="/catalog"><Icon name="tag" size={13} strokeWidth={2}/>{t.nav_catalog}</Link></li>
              <li><Link to="/order"><Icon name="cart" size={13} strokeWidth={2}/>{t.nav_order}</Link></li>
              <li><Link to="/contact"><Icon name="mail" size={13} strokeWidth={2}/>{t.nav_contact}</Link></li>
            </ul>
          </div>

          <div className={styles.col}>
            <h4 className={styles.colTitle}>{t.foot_nl}</h4>
            <p className={styles.nlDesc}>{t.foot_nl_desc}</p>
            {!subscribed ? (
              <div className={styles.nlForm}>
                <input className={styles.nlInput} type="email" placeholder={t.foot_nl_ph}
                  value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSub()} />
                <button className={styles.nlBtn} onClick={handleSub}>
                  <Icon name="arrowRight" size={15} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <p className={styles.nlSuccess}>
                <Icon name="checkCircle" size={16} color="#8fba8f" strokeWidth={2} />
                {t.foot_ok}
              </p>
            )}
          </div>

        </div>

        <div className={styles.bottom}>
          <span>{t.foot_copy}</span>
          <div className={styles.bottomLinks}>
            <a href="#">{t.foot_privacy}</a>
            <a href="#">{t.foot_terms}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
