import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { adminApi, ApiError } from './admin-api'

interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  login: (apiKey: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const key = localStorage.getItem('admin_api_key')
    if (!key) {
      setIsLoading(false)
      return
    }

    adminApi.validateKey()
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        localStorage.removeItem('admin_api_key')
        setIsAuthenticated(false)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (apiKey: string) => {
    localStorage.setItem('admin_api_key', apiKey)
    try {
      await adminApi.validateKey()
      setIsAuthenticated(true)
    } catch (err) {
      localStorage.removeItem('admin_api_key')
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        throw new Error('Invalid API key')
      }
      throw new Error('Could not connect to server')
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_api_key')
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
