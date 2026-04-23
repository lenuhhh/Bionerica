import React from 'react'
import { useLang } from '../../i18n/LangContext.jsx'
import Icon from '../../components/Icon/Icon.jsx'
import styles from './AboutPage.module.css'

const VAL_ICONS = ['sprout','handshake','award']

function splitTitle(full, italic) {
  const idx = full.indexOf(italic)
  if (idx === -1) return <>{full}</>
  return <>{full.slice(0,idx)}<span className="serif-italic">{italic}</span>{full.slice(idx+italic.length)}</>
}

export default function AboutPage() {
  const { t } = useLang()
  return (
    <div className={styles.page}><div className="container"><div className={styles.inner}>

      <div className={styles.hero}>
        <span className="eyebrow">{t.ap_eyebrow}</span>
        <h1 className={styles.heroTitle}>{splitTitle(t.ap_title, t.ap_italic)}</h1>
        <p className={styles.heroSub}>{t.ap_sub}</p>
      </div>

      <div className={styles.storyGrid}>
        <div className={styles.storyImg}>
          <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=480&fit=crop" alt="Greenhouse" />
        </div>
        <div className={styles.storyText}>
          <span className="eyebrow">{t.ap_story_ey}</span>
          <h2 className={styles.storyTitle}>{splitTitle(t.ap_story_t, t.ap_story_it)}</h2>
          <p>{t.ap_story_p1}</p>
          <p style={{marginTop:16}}>{t.ap_story_p2}</p>
          <div className={styles.statsRow}>
            {[t.ap_stat1, t.ap_stat2, t.ap_stat3].map(([num,label]) => (
              <div key={label}>
                <div className={styles.statNum}>{num}</div>
                <div className={styles.statLabel}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <span className="eyebrow">{t.ap_team_ey}</span>
        <h2 className={styles.sectionTitle}>{splitTitle(t.ap_team_t, t.ap_team_it)}</h2>
        <div className={styles.teamGrid}>
          {t.ap_team.map(({ avatar, name, role, desc }) => (
            <div key={name} className={styles.teamCard}>
              <div className={styles.avatar}>{avatar}</div>
              <div className={styles.teamName}>{name}</div>
              <div className={styles.teamRole}>{role}</div>
              <div className={styles.teamDesc}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <span className="eyebrow">{t.ap_val_ey}</span>
        <h2 className={styles.sectionTitle}>{t.ap_val_t}</h2>
        <div className={styles.valuesGrid}>
          {t.ap_vals.map(({ title, desc }, i) => (
            <div key={title} className={styles.valueCard}>
              <div className={styles.valueIconWrap}>
                <Icon name={VAL_ICONS[i]} size={26} color="#4a7c59" strokeWidth={1.7} />
              </div>
              <div className={styles.valueTitle}>{title}</div>
              <div className={styles.valueDesc}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

    </div></div></div>
  )
}
