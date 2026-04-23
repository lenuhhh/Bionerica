import React, { useState, useEffect } from 'react'
import { useLang } from '../../../i18n/LangContext.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import s from './TestimonialsSection.module.css'

export default function TestimonialsSection() {
  const { t } = useLang()
  const { loadApprovedReviews } = useAuth()
  const [liveReviews, setLiveReviews] = useState([])

  useEffect(() => {
    loadApprovedReviews().then(res => {
      if (res && res.length > 0) setLiveReviews(res)
    }).catch(() => {})
  }, [])

  // Merge: live approved reviews first, then fallback static ones
  const items = liveReviews.length > 0
    ? liveReviews.map(r => ({ name: r.name, role: r.role || '', text: r.text }))
    : t.test_items

  return (
    <section><div className="container">
      <div className={s.top}><span className="eyebrow reveal">{t.test_eyebrow}</span><h2 className={`${s.title} reveal`}>{t.test_title.replace(t.test_italic,'')}<span className="serif-italic">{t.test_italic}</span></h2></div>
      <div className={s.grid}>
        {items.map((item,i)=>(
          <div key={item.name + i} className={`${s.card} reveal`} style={{transitionDelay:`${i*0.1}s`}}>
            <div className={s.stars}>★★★★★</div>
            <p className={s.text}>"{item.text}"</p>
            <div className={s.author}>
              <div className={s.avatar}>{item.name[0]}</div>
              <div><div className={s.name}>{item.name}</div><div className={s.role}>{item.role}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div></section>
  )
}
