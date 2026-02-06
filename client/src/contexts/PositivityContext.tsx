import { createContext, useContext, useState, useEffect } from 'react'

interface PositivityContextValue {
  /** 0 = all negative, 25, 50 = balanced, 75, 100 = all positive */
  positivity: number
  setPositivity: (value: number) => void
}

const PositivityContext = createContext<PositivityContextValue>({
  positivity: 50,
  setPositivity: () => {},
})

const STORAGE_KEY = 'ar-positivity'
const VALID_VALUES = [0, 25, 50, 75, 100]

function clampToValid(value: number): number {
  // Snap to nearest valid value
  let closest = VALID_VALUES[0]
  let minDist = Math.abs(value - closest)
  for (const v of VALID_VALUES) {
    const dist = Math.abs(value - v)
    if (dist < minDist) {
      closest = v
      minDist = dist
    }
  }
  return closest
}

export function PositivityProvider({ children }: { children: React.ReactNode }) {
  const [positivity, setPositivityRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed)) return clampToValid(parsed)
      }
    } catch {
      // localStorage unavailable
    }
    return 50
  })

  const setPositivity = (value: number) => {
    setPositivityRaw(clampToValid(value))
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(positivity))
    } catch {
      // localStorage unavailable
    }
  }, [positivity])

  return (
    <PositivityContext.Provider value={{ positivity, setPositivity }}>
      {children}
    </PositivityContext.Provider>
  )
}

export function usePositivity() {
  return useContext(PositivityContext)
}
