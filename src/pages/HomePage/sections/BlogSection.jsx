import React from 'react'
import { useLang } from '../../../i18n/LangContext.jsx'
import s from './BlogSection.module.css'
const imgs = [
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=260&fit=crop',
  'https://images.unsplash.com/photo-1490750967868-88df5691cc99?w=400&h=260&fit=crop',
]
export default function BlogSection() {
  const { t } = useLang()
  return (
    <section><div className="container">
      <div className={s.top}><span className="eyebrow reveal">{t.blog_eyebrow}</span><h2 className={`${s.title} reveal`}>{t.blog_title.replace(t.blog_italic,'')}<span className="serif-italic">{t.blog_italic}</span></h2></div>
      <div className={s.grid}>
        {t.blog_posts.map((p,i)=>(
          <div key={p.title} className={`${s.card} reveal`} style={{transitionDelay:`${i*0.1}s`}}>
            <div className={s.imgWrap}><img src={imgs[i]} alt={p.title}/></div>
            <div className={s.info}><span className={s.cat}>{p.cat}</span><h3 className={s.postTitle}>{p.title}</h3><div className={s.date}>{p.date}</div></div>
          </div>
        ))}
      </div>
    </div></section>
  )
}
