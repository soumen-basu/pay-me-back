import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/AuthProvider.tsx'
import { TierProvider } from './contexts/TierContext.tsx'
import { ExpenseSelectionProvider } from './contexts/ExpenseSelectionContext.tsx'
import { NotificationProvider } from './contexts/NotificationContext.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { Login } from './components/Login.tsx'
import { Verify } from './components/Verify.tsx'
import { Profile } from './components/Profile.tsx'
import { Dashboard } from './components/Dashboard.tsx'
import { ClaimBuilder } from './components/ClaimBuilder.tsx'
import { ExpensesPage } from './components/ExpensesPage.tsx'
import { ClaimsPage } from './components/ClaimsPage.tsx'
import { ApprovalsPage } from './components/ApprovalsPage.tsx'
import { ClaimReview } from './components/ClaimReview.tsx'
import { CategoriesPage } from './components/CategoriesPage.tsx'
import { AdminModeProvider } from './contexts/AdminModeContext.tsx'
import { AdminDashboard } from './components/AdminDashboard.tsx'
import { UserManagement } from './components/UserManagement.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TierProvider>
          <AdminModeProvider>
          <NotificationProvider>
          <ExpenseSelectionProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/me" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/claims/new" element={
              <ProtectedRoute>
                <ClaimBuilder />
              </ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute>
                <ExpensesPage />
              </ProtectedRoute>
            } />
            <Route path="/claims" element={
              <ProtectedRoute>
                <ClaimsPage />
              </ProtectedRoute>
            } />
            <Route path="/categories" element={
              <ProtectedRoute>
                <CategoriesPage />
              </ProtectedRoute>
            } />
            <Route path="/approvals" element={
              <ProtectedRoute>
                <ApprovalsPage />
              </ProtectedRoute>
            } />
            <Route path="/claims/:id" element={
              <ProtectedRoute>
                <ClaimReview />
              </ProtectedRoute>
            } />
            <Route path="/claims/:id/review" element={
              <ProtectedRoute>
                <ClaimReview />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } />
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ExpenseSelectionProvider>
          </NotificationProvider>
          </AdminModeProvider>
        </TierProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

