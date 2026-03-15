import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import Header from './components/Header.jsx'
import Home from './pages/Home.jsx'
import AdminPage from './pages/AdminPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AboutPage from './pages/AboutPage.jsx'

const globalStyles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, sans-serif;
    background-color: #f9fafb;
    color: #1f2937;
    min-height: 100vh;
  }
`

function ProtectedRoute({ children }) {
  const { token, checking } = useAuth()

  if (checking) return null
  if (!token) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <>
      <Header />
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="/acerca" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

function App() {
  return (
    <AuthProvider>
      <style>{globalStyles}</style>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
