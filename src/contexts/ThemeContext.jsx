import { createContext, useContext, useState, useEffect } from 'react'

const ThemeCtx = createContext({ theme: 'dark', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeCtx.Provider value={{ theme, toggleTheme }}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => useContext(ThemeCtx)
