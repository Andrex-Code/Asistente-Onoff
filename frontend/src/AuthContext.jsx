import React, { createContext, useContext, useState, useEffect } from 'react'
import { API_URL } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('current_user')
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  })
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }
    fetch(`${API_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          localStorage.removeItem('admin_token')
          localStorage.removeItem('current_user')
          setToken(null)
          setUser(null)
          return
        }
        const data = await res.json()
        setUser(data.user)
        localStorage.setItem('current_user', JSON.stringify(data.user))
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [])

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Error de inicio de sesion')
    }

    const data = await res.json()
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('current_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = async () => {
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
    localStorage.removeItem('admin_token')
    localStorage.removeItem('current_user')
    setToken(null)
    setUser(null)
  }

  const authHeaders = () => {
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  }

  const hasPermission = (permission) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return !!user.permissions?.[permission]
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ token, user, isAdmin, login, logout, authHeaders, checking, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
