import React from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../../i18n/LangContext.jsx'
import s from './AboutSection.module.css'
export default function AboutSection() {
  const { t } = useLang()
  return (
    <section><div className="container"><div className={s.grid}>
      <div className={s.imgCol}><img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=560&h=480&fit=crop" alt="" className={s.img} /></div>
      <div className={s.text}>
        <span className="eyebrow reveal">{t.about_eyebrow}</span>
        <h2 className={`${s.title} reveal reveal-delay-1`}>{t.about_title.replace(t.about_italic,'')}<span className="serif-italic">{t.about_italic}</span></h2>
        <p className={`${s.desc} reveal reveal-delay-2`}>{t.about_desc}</p>
        <Link to="/about" className="btn-outline reveal reveal-delay-3">{t.about_link}</Link>
      </div>
    </div></div></section>
  )
}
