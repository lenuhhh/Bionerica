import React, { useState, useEffect } from 'react'
import styles from './Preloader.module.css'

export default function Preloader() {
  const [phase, setPhase] = useState('loading') // loading → fading → done

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fading'), 1400)
    const t2 = setTimeout(() => setPhase('done'),   2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === 'done') return null

  return (
    <div className={`${styles.overlay} ${phase === 'fading' ? styles.fading : ''}`}>
      <div className={styles.inner}>
        {/* Animated leaf SVG */}
        <div className={styles.logoWrap}>
          <svg className={styles.leafSvg} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="23" stroke="#2d4a2d" strokeWidth="1.5" strokeDasharray="144" strokeDashoffset="144">
              <animate attributeName="stroke-dashoffset" from="144" to="0" dur="1s" ease="ease-out" fill="freeze"/>
            </circle>
            <path
              d="M24 8C14 8 9 16 9 24c0 5 2.5 9 7 12M24 8c10 0 15 8 15 16 0 5-2.5 9-7 12M24 8v32M15 14c3 2 6 5 9 9M33 14c-3 2-6 5-9 9"
              stroke="#8fba8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="120" strokeDashoffset="120"
            >
              <animate attributeName="stroke-dashoffset" from="120" to="0" dur="0.9s" begin="0.2s" fill="freeze"/>
            </path>
          </svg>
        </div>
        <div className={styles.brand}>Bionerika Agency</div>
        <div className={styles.bar}><div className={styles.barFill} /></div>
      </div>
    </div>
  )
}
