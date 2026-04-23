import React, { useEffect, useRef } from 'react'
import styles from './CustomCursor.module.css'

export default function CustomCursor() {
  const dotRef  = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    // Hide on touch devices
    if ('ontouchstart' in window) return

    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let mx = -100, my = -100   // mouse
    let rx = -100, ry = -100   // ring (lagged)
    let raf = null

    const onMove = (e) => {
      mx = e.clientX
      my = e.clientY
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`
    }

    const lerp = (a, b, t) => a + (b - a) * t

    const animate = () => {
      rx = lerp(rx, mx, 0.12)
      ry = lerp(ry, my, 0.12)
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`
      raf = requestAnimationFrame(animate)
    }

    const onEnterLink = () => {
      dot.classList.add(styles.dotHover)
      ring.classList.add(styles.ringHover)
    }
    const onLeaveLink = () => {
      dot.classList.remove(styles.dotHover)
      ring.classList.remove(styles.ringHover)
    }
    const onDown = () => ring.classList.add(styles.ringClick)
    const onUp   = () => ring.classList.remove(styles.ringClick)

    const bindLinks = () => {
      document.querySelectorAll('a, button, [role=button], input, textarea, select, label')
        .forEach(el => {
          el.addEventListener('mouseenter', onEnterLink)
          el.addEventListener('mouseleave', onLeaveLink)
        })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup',   onUp)
    document.body.style.cursor = 'none'

    raf = requestAnimationFrame(animate)
    bindLinks()

    // Re-bind on DOM changes
    const observer = new MutationObserver(bindLinks)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup',   onUp)
      cancelAnimationFrame(raf)
      observer.disconnect()
      document.body.style.cursor = ''
    }
  }, [])

  // Don't render on touch
  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null

  return (
    <>
      <div ref={dotRef}  className={styles.dot}  />
      <div ref={ringRef} className={styles.ring} />
    </>
  )
}
