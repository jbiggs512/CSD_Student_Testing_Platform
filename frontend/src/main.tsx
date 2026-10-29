import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from "react-router";
import { App } from './App'
import { LandingPage } from './pages/landing';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { DashboardPage } from './pages/dashboard';
import { NavBar } from './shared/components';
import './index.css'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <StrictMode>
      <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        <Route element={<NavBar />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
      </Routes>
      <App />
    </StrictMode>
  </BrowserRouter>,
)


