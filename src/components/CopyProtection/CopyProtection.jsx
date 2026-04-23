import { useEffect } from 'react'

export default function CopyProtection() {
  useEffect(() => {
    const preventContext = (e) => e.preventDefault()
    const preventSelect  = (e) => e.preventDefault()
    const preventDrag    = (e) => e.preventDefault()
    const preventKeys    = (e) => {
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && ['u', 's', 'a', 'c'].includes(key)) {
        e.preventDefault()
      }
      if (e.key === 'F12') e.preventDefault()
    }

    document.addEventListener('contextmenu', preventContext)
    document.addEventListener('selectstart', preventSelect)
    document.addEventListener('dragstart',   preventDrag)
    document.addEventListener('keydown',     preventKeys)

    return () => {
      document.removeEventListener('contextmenu', preventContext)
      document.removeEventListener('selectstart', preventSelect)
      document.removeEventListener('dragstart',   preventDrag)
      document.removeEventListener('keydown',     preventKeys)
    }
  }, [])

  return null
}
