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
const CoursesPage = lazy(() =>
  import('./pages/courses').then((m) => ({ default: m.CoursesPage })),
)
const LecturersPage = lazy(() =>
  import('./pages/lecturers').then((m) => ({ default: m.LecturersPage })),
)
const LecturerDashboardPage = lazy(() =>
  import('./pages/lecturerDashboard').then((m) => ({ default: m.LecturerDashboardPage })),
)
const StudentsPage = lazy(() =>
  import('./pages/students').then((m) => ({ default: m.StudentsPage })),
)
const TestManagementPage = lazy(() =>
  import('./pages/tests').then((m) => ({ default: m.TestManagementPage })),
)
const QuestionPoolPage = lazy(() =>
  import('./pages/questionPool').then((m) => ({ default: m.QuestionPoolPage })),
)
const TestPage = lazy(() =>
  import('./pages/test').then((m) => ({ default: m.TestPage })),
)

const StatisticsPage = lazy(() =>
  import('./pages/statistics').then((m) => ({ default: m.StatisticsPage })),
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
                <Route path="/statistics" element={<StatisticsPage />} />
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
                  path="/courses"
                  element={<CoursesPage />}
                />
                <Route
                  path="/accounts"
                  element={<LecturersPage />}
                />
                <Route
                  path="/lecturers"
                  element={<LecturersPage />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute allowedRoles={['lecturer', 'admin']} />
                }
              >
                <Route 
                  path="/lecturerDashboard"
                  element={<LecturerDashboardPage />} />
                <Route 
                  path="/students"
                  element={<StudentsPage />} />
                <Route 
                  path="/tests"
                  element={<TestManagementPage />} />
                <Route 
                  path="/questionPool"
                  element={<QuestionPoolPage />} />
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
