import React from 'react'
import { useLang } from '../../../i18n/LangContext.jsx'
import Icon from '../../../components/Icon/Icon.jsx'
import s from './GrowSection.module.css'

const STEP_ICONS = ['seed','droplet','sun','package']

/* Split title around italic word, return [before, italic, after] */
function splitTitle(title, italic) {
  const idx = title.indexOf(italic)
  if (idx === -1) return [title, '', '']
  return [title.slice(0, idx), italic, title.slice(idx + italic.length)]
}

export default function GrowSection() {
  const { t } = useLang()
  const [before, italic, after] = splitTitle(t.grow_title, t.grow_italic)
  return (
    <section className={s.section}>
      <div className="container" style={{position:'relative',zIndex:1}}>
        <div className={s.inner}>
          <span className="eyebrow reveal" style={{color:'var(--green-light)'}}>{t.grow_eyebrow}</span>
          <h2 className={`${s.title} reveal`}>
            {before}<span style={{fontStyle:'italic'}}>{italic}</span>{after}
          </h2>
          <div className={s.grid}>
            {t.grow_steps.map(([title,desc],i) => (
              <div key={title} className={`${s.step} reveal`} style={{transitionDelay:`${i*0.1}s`}}>
                <div className={s.iconWrap}>
                  <Icon name={STEP_ICONS[i]} size={24} color="#8fba8f" strokeWidth={1.8} />
                </div>
                <div className={s.stepNum}>0{i+1}</div>
                <div className={s.stepTitle}>{title}</div>
                <div className={s.stepDesc}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
