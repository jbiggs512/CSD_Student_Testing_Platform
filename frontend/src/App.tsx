import { Route, Routes } from 'react-router';
import { HomeLayout } from './shared/components/HomeLayout';
import { LandingPage } from './pages/landing';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { DashboardPage } from './pages/dashboard';
import { MainLayout } from './shared/components/MainLayout';

export function App() {
  return <div id="app-shell">
    <Routes>
      <Route element={<HomeLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
    </Routes>
  </div >
}