'use client'

import { useState, useEffect, createContext, useContext, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // Resolve system theme
  const resolveSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])

  // Apply theme to document
  const applyTheme = useCallback((resolved: 'light' | 'dark') => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
    root.style.colorScheme = resolved
  }, [])

  // Initialize theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('mcq-theme') as Theme | null
    if (stored) {
      setThemeState(stored)
    }
  }, [])

  // Update resolved theme
  useEffect(() => {
    if (theme === 'system') {
      const resolved = resolveSystemTheme()
      setResolvedTheme(resolved)
      applyTheme(resolved)

      // Listen for system changes
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        const newResolved = e.matches ? 'dark' : 'light'
        setResolvedTheme(newResolved)
        applyTheme(newResolved)
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      setResolvedTheme(theme)
      applyTheme(theme)
    }
  }, [theme, resolveSystemTheme, applyTheme])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('mcq-theme', newTheme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
