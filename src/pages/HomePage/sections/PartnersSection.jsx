import React from 'react'
import s from './PartnersSection.module.css'

/* ── SVG brand logos — agro / greenhouse / food industry style ── */
const PARTNERS = [
  {
    name: 'AgroSoyuz',
    svg: (
      <svg viewBox="0 0 120 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 28L14 10h4l6 18h-3.5l-1.2-4H12.7l-1.2 4H8zm5.6-6.8h4.8l-2.4-7.6-2.4 7.6z" fill="currentColor"/>
        <path d="M26 28V10h6.5c2 0 3.5.5 4.6 1.4 1.1.9 1.6 2.2 1.6 3.8 0 1.1-.3 2-.8 2.8-.5.8-1.3 1.4-2.2 1.7l3.5 8.3H35l-3.1-7.6H29V28H26zm3-10h3.2c1 0 1.8-.3 2.3-.8.5-.5.8-1.2.8-2s-.3-1.5-.8-2c-.5-.5-1.3-.8-2.3-.8H29V18z" fill="currentColor"/>
        <circle cx="48" cy="19" r="1.8" fill="var(--green-light)" opacity=".7"/>
        <text x="54" y="24" fontSize="13" fontWeight="600" fontFamily="DM Sans,sans-serif" fill="currentColor" letterSpacing=".02em">Soyuz</text>
      </svg>
    ),
  },
  {
    name: 'ProdMarket',
    svg: (
      <svg viewBox="0 0 130 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="8" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M9 19l4 4 8-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <text x="30" y="24" fontSize="13" fontWeight="600" fontFamily="DM Sans,sans-serif" fill="currentColor" letterSpacing=".02em">ProdMarket</text>
      </svg>
    ),
  },
  {
    name: 'FreshLine',
    svg: (
      <svg viewBox="0 0 110 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 14h14M6 19h10M6 24h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="23" cy="12" r="5" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M21 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" fill="currentColor" opacity=".3"/>
        <text x="32" y="24" fontSize="13" fontWeight="600" fontFamily="DM Sans,sans-serif" fill="currentColor" letterSpacing=".02em">FreshLine</text>
      </svg>
    ),
  },
  {
    name: 'EcoTorg',
    svg: (
      <svg viewBox="0 0 100 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 26C7.6 23 5 19.3 5 15a9 9 0 0 1 9-9c2.4 0 4.6.9 6.2 2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M14 8s1 5-2 9 2 8 2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".5"/>
        <path d="M19 17.4A9 9 0 0 1 14 26" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <text x="28" y="24" fontSize="13" fontWeight="600" fontFamily="DM Sans,sans-serif" fill="currentColor" letterSpacing=".02em">EcoTorg</text>
      </svg>
    ),
  },
  {
    name: 'GreenExpress',
    svg: (
      <svg viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="12" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M20 17h5l4 7H20v-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <circle cx="7"  cy="26" r="2.2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="23" cy="26" r="2.2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 12V9M3 9h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".4"/>
        <text x="33" y="24" fontSize="13" fontWeight="600" fontFamily="DM Sans,sans-serif" fill="currentColor" letterSpacing=".02em">GreenExpress</text>
      </svg>
    ),
  },
  {
    name: 'FloraOpt',
    svg: (
      <svg viewBox="0 0 105 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 26V16M14 16c0 0-5-1-7-6 3 0 7 2 7 6zM14 16c0 0 5-1 7-6-3 0-7 2-7 6z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="14" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 26h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <text x="28" y="24" fontSize="13" fontWeight="600" fontFamily="DM Sans,sans-serif" fill="currentColor" letterSpacing=".02em">FloraOpt</text>
      </svg>
    ),
  },
]

export default function PartnersSection() {
  return (
    <section className={s.section}>
      <div className={s.logosRow}>
        {PARTNERS.map(({ name, svg }) => (
          <div key={name} className={s.logo} title={name}>
            {svg}
          </div>
        ))}
      </div>
    </section>
  )
}
