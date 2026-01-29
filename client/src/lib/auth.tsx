import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { UserRole } from '@shared/types'
import { authApi, setAccessToken, ApiError } from './admin-api'

interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, try to restore session via refresh token cookie
  useEffect(() => {
    // Clean up old localStorage-based auth
    localStorage.removeItem('admin_api_key')

    authApi.refresh()
      .then(token => {
        if (token) {
          return authApi.me()
        }
        return null
      })
      .then(userData => {
        if (userData) {
          setUser(userData as AuthUser)
        }
      })
      .catch(() => {
        setUser(null)
        setAccessToken(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await authApi.login(email, password)
      setAccessToken(result.accessToken)
      setUser(result.user as AuthUser)
    } catch (err) {
      setAccessToken(null)
      setUser(null)
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        throw new Error('Invalid email or password')
      }
      throw new Error('Could not connect to server')
    }
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
