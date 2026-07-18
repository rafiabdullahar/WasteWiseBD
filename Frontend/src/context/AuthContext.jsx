import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('wwbd_user')
    return saved ? JSON.parse(saved) : null
  })
  const [loading, setLoading] = useState(true)

  // On mount, verify the stored token is still valid by hitting /api/auth/me.
  useEffect(() => {
    const verifySession = async () => {
      const token = localStorage.getItem('wwbd_token')
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const { data } = await api.get('/auth/me')
        if (data.success) {
          setUser(data.data.user)
          localStorage.setItem('wwbd_user', JSON.stringify(data.data.user))
        }
      } catch {
        // Token invalid or expired — clear everything.
        localStorage.removeItem('wwbd_token')
        localStorage.removeItem('wwbd_user')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    verifySession()
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.success) {
      localStorage.setItem('wwbd_token', data.data.token)
      localStorage.setItem('wwbd_user', JSON.stringify(data.data.user))
      setUser(data.data.user)
    }
    return data
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    if (data.success) {
      localStorage.setItem('wwbd_token', data.data.token)
      localStorage.setItem('wwbd_user', JSON.stringify(data.data.user))
      setUser(data.data.user)
    }
    return data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      localStorage.removeItem('wwbd_token')
      localStorage.removeItem('wwbd_user')
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
