import React, { Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import './App.css';

// Route-level code splitting: each page is its own chunk, fetched on first
// visit rather than bundled into the single ~660 KB entry file everything
// used to ship in. LandingPage stays a normal import since it's what every
// visitor loads first - splitting it out would just trade one big eager
// chunk for two sequential ones on the page nobody skips.
import LandingPage from './pages/LandingPage';
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const PlanHealthPage = React.lazy(() => import('./pages/PlanHealthPage'));
const WhatIfPage = React.lazy(() => import('./pages/WhatIfPage'));
const AuditLogPage = React.lazy(() => import('./pages/AuditLogPage'));
const FieldReportPage = React.lazy(() => import('./pages/FieldReportPage'));
const VulnerableHabitationsPage = React.lazy(() => import('./pages/VulnerableHabitationsPage'));
const RelocationSitesPage = React.lazy(() => import('./pages/RelocationSitesPage'));
const AboutPage = React.lazy(() => import('./pages/AboutPage'));

/** Minimal, theme-matched placeholder shown while a lazy page chunk loads. */
function RouteLoadingFallback() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted, #94a3b8)',
        fontSize: '0.9rem',
      }}
    >
      Loading…
    </div>
  );
}

// Inner component so we can use useLocation inside BrowserRouter
function AppRoutes({ theme, toggleTheme }) {
  const location = useLocation();

  return (
    <>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <AnimatePresence mode="wait">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<LandingPage theme={theme} />} />
            <Route path="/dashboard" element={<Dashboard theme={theme} />} />
            <Route path="/plan-health" element={<PlanHealthPage theme={theme} />} />
            <Route path="/what-if" element={<WhatIfPage theme={theme} />} />
            <Route path="/audit-log" element={<AuditLogPage theme={theme} />} />
            <Route path="/field-report" element={<FieldReportPage theme={theme} />} />
            <Route path="/habitations" element={<VulnerableHabitationsPage theme={theme} />} />
            <Route path="/sites" element={<RelocationSitesPage theme={theme} />} />
            <Route path="/about" element={<AboutPage theme={theme} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </>
  );
}

function App() {
  const [theme, setTheme] = useState('dark');

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('theme-light'); // html paints the canvas; keep it in step with body
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('theme-light');
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <BrowserRouter>
      <div className="App">
        <AppRoutes theme={theme} toggleTheme={toggleTheme} />
      </div>
    </BrowserRouter>
  );
}

export default App;
