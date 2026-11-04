import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { App } from './App'
import { SubjectsPage } from './pages/subjects'
import { NavBar, ProtectedRoute } from './shared/components'
import './index.css'

const LandingPage = lazy(() =>
  import('./pages/landing').then((m) => ({ default: m.LandingPage })),
)
const LoginPage = lazy(() =>
  import('./pages/login').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('./pages/register').then((m) => ({ default: m.RegisterPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/dashboard').then((m) => ({ default: m.DashboardPage })),
)

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <StrictMode>
      <Suspense
        fallback={<div aria-busy="true" className="min-h-screen bg-background" />}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<NavBar />}>
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route
                  path="/subjects"
                  element={<SubjectsPage />}
                />
              </Route>
            </Route>
            <Route path="*" element={<ProtectedRoute allowedRoles={[]} />} />
          </Route>
        </Routes>
      </Suspense>
      <App />
    </StrictMode>
  </BrowserRouter>,
)
