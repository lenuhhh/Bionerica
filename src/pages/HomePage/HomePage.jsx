import React, { useEffect } from 'react'
import HeroSection from './sections/HeroSection.jsx'
import TickerSection from './sections/TickerSection.jsx'
import PartnersSection from './sections/PartnersSection.jsx'
import AboutSection from './sections/AboutSection.jsx'
import ProductsSection from './sections/ProductsSection.jsx'
import GrowSection from './sections/GrowSection.jsx'
import AdvantagesSection from './sections/AdvantagesSection.jsx'
import TestimonialsSection from './sections/TestimonialsSection.jsx'
import BlogSection from './sections/BlogSection.jsx'
import TrustStrip from './sections/TrustStrip.jsx'

export default function HomePage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <HeroSection />
      <TickerSection />
      <PartnersSection />
      <AboutSection />
      <ProductsSection />
      <GrowSection />
      <AdvantagesSection />
      <TestimonialsSection />
      <BlogSection />
      <TrustStrip />
    </>
  )
}
