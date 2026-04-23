import React from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../../../i18n/LangContext.jsx'
import s from './HeroSection.module.css'

export default function HeroSection() {
  const { t } = useLang()
  return (
    <section className={s.hero}>
      <div className="container">
        <div className={s.inner}>
          <div className={s.content}>
            <span className="eyebrow reveal">{t.hero_eyebrow}</span>
            <h1 className={`${s.title} reveal reveal-delay-1`}>
              {t.hero_title1}<br /><span className="serif-italic">{t.hero_title2}</span>
            </h1>
            <p className={`${s.sub} reveal reveal-delay-2`}>{t.hero_sub}</p>
            <div className={`${s.ctas} reveal reveal-delay-3`}>
              <Link to="/order" className="btn-primary">{t.hero_cta1}</Link>
              <Link to="/catalog" className="btn-outline">{t.hero_cta2}</Link>
            </div>
            <div className={`${s.stats} reveal reveal-delay-3`}>
              {[['8400',t.hero_stat1],['340+',t.hero_stat2],['12+',t.hero_stat3]].map(([n,l])=>(
                <div key={l} className={s.stat}>
                  <div className={s.statNum}>{n}</div>
                  <div className={s.statLbl}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className={s.visual}>
            <div className={s.imgWrap}>
              <img className={s.heroImg} src="https://images.unsplash.com/photo-1543362906-acfc16c67564?w=900&h=700&fit=crop&crop=center" alt="" />
              <div className={s.deliveryBadge}>
                <span className={s.badgeLabel}>Delivery</span>
                <span className={s.badgeValue}>from 1 day</span>
              </div>
              <div className={s.ratingBadge}>
                <span className={s.badgeLabel}>Rating</span>
                <span className={s.badgeValue}>4.9 / 5.0</span>
              </div>
              <div className={s.floatCard}><span>🌿</span>{t.hero_organic}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
