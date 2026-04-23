import React from 'react'
import { useLang } from '../../../i18n/LangContext.jsx'
import Icon from '../../../components/Icon/Icon.jsx'
import s from './AdvantagesSection.module.css'

const ADV_ICONS = ['leaf','truck','award','briefcase']

export default function AdvantagesSection() {
  const { t } = useLang()
  return (
    <section><div className="container">
      <div className={s.top}>
        <span className="eyebrow reveal">{t.adv_eyebrow}</span>
        <h2 className={`${s.title} reveal`}>
          {t.adv_title.replace(t.adv_italic,'')}
          <span className="serif-italic">{t.adv_italic}</span>
        </h2>
      </div>
      <div className={s.grid}>
        {t.adv_items.map(([,title,desc],i) => (
          <div key={title} className={`${s.card} reveal`} style={{transitionDelay:`${i*0.1}s`}}>
            <div className={s.iconWrap}>
              <Icon name={ADV_ICONS[i]} size={26} color="#4a7c59" strokeWidth={1.6} />
            </div>
            <h3 className={s.cardTitle}>{title}</h3>
            <p className={s.cardDesc}>{desc}</p>
          </div>
        ))}
      </div>
    </div></section>
  )
}
