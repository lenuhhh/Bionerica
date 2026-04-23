import React from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../../i18n/LangContext.jsx'
import s from './TrustStrip.module.css'
export default function TrustStrip() {
  const { t } = useLang()
  return (
    <section className={s.strip}><div className="container"><div className={s.inner}>
      <div className={s.text}><h2 className={s.title}>{t.trust_title}</h2><p className={s.sub}>{t.trust_sub}</p></div>
      <div className={s.btns}>
        <Link to="/order" className="btn-primary">{t.trust_cta1}</Link>
        <Link to="/contact" className="btn-outline" style={{borderColor:'rgba(255,255,255,.4)',color:'#fff'}}>{t.trust_cta2}</Link>
      </div>
    </div></div></section>
  )
}
