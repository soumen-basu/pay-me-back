import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/AuthProvider.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { Login } from './components/Login.tsx'
import { Verify } from './components/Verify.tsx'
import { Profile } from './components/Profile.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/me" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
