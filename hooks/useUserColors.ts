'use client'

import { useState, useEffect, useCallback } from 'react'

export interface UserColors {
  mine: string
  shared: string
  partner: string
}

export const COLOR_DEFAULTS: UserColors = {
  mine: '#39ff14',
  shared: '#00d4ff',
  partner: '#7c3aed',
}

export const COLOR_PRESETS = [
  '#39ff14', '#00d4ff', '#7c3aed',
  '#ff006e', '#ff6b00', '#ffd60a',
  '#06b6d4', '#8b5cf6', '#ec4899',
  '#f97316', '#10b981', '#3b82f6',
]

const STORAGE_KEY = 'labtask_colors'

function readFromStorage(): UserColors {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...COLOR_DEFAULTS, ...JSON.parse(stored) }
  } catch {}
  return COLOR_DEFAULTS
}

export function useUserColors() {
  const [colors, setColors] = useState<UserColors>(COLOR_DEFAULTS)

  useEffect(() => {
    setColors(readFromStorage())

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setColors(readFromStorage())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const updateColor = useCallback((key: keyof UserColors, value: string) => {
    setColors((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      // Notify other components in the same tab
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(next) }))
      return next
    })
  }, [])

  const resetColors = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setColors(COLOR_DEFAULTS)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: JSON.stringify(COLOR_DEFAULTS) }))
  }, [])

  return { colors, updateColor, resetColors }
}
