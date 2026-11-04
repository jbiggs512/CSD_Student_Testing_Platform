import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { App } from './App'
import { DashboardPage } from './pages/dashboard'
import { LandingPage } from './pages/landing'
import { LoginPage } from './pages/login'
import { RegisterPage } from './pages/register'
import { SubjectManagementPage } from './pages/subjectManagement'
import { NavBar, ProtectedRoute } from './shared/components'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <StrictMode>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<NavBar />}>
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route
              path="/subjectManagement"
              element={<SubjectManagementPage />}
            />
          </Route>
          <Route path="*" element={<ProtectedRoute allowedRoles={[]} />} />
          
        </Route>
      </Routes>
      <App />
    </StrictMode>
  </BrowserRouter>,
)
