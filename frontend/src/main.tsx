import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { App } from './App'
import { NavBar, ProtectedRoute, Toaster } from './shared/components'
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
const LeaderboardPage = lazy(() =>
  import('./pages/leaderboard').then((m) => ({ default: m.LeaderboardPage })),
)
const AdminDashboardPage = lazy(() =>
  import('./pages/adminDashboard').then((m) => ({ default: m.AdminDashboardPage })),
)
const SubjectsPage = lazy(() =>
  import('./pages/subjects').then((m) => ({ default: m.SubjectsPage })),
)
const LecturersPage = lazy(() =>
  import('./pages/lecturers').then((m) => ({ default: m.LecturersPage })),
)
const TestPage = lazy(() =>
  import('./pages/test').then((m) => ({ default: m.TestPage })),
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
                <Route path="/leaderboards" element={<LeaderboardPage />} />
              </Route>
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route
                  path="/adminDashboard"
                  element={<AdminDashboardPage />}
                />
                <Route
                  path="/subjects"
                  element={<SubjectsPage />}
                />
                <Route
                  path="/lecturers"
                  element={<LecturersPage />}
                />
              </Route>
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/test/:id" element={<TestPage />} />
            </Route>
            <Route path="*" element={<ProtectedRoute allowedRoles={[]} />} />
          </Route>
        </Routes>
      </Suspense>
      <App />
      <Toaster />
    </StrictMode>
  </BrowserRouter>,
)
