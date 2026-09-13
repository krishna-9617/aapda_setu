import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import Navbar from './components/Navbar';
import PlanHealthPage from './pages/PlanHealthPage';
import WhatIfPage from './pages/WhatIfPage';
import AuditLogPage from './pages/AuditLogPage';
import FieldReportPage from './pages/FieldReportPage';
import './App.css';

// Inner component so we can use useLocation inside BrowserRouter
function AppRoutes({ theme, toggleTheme }) {
  const location = useLocation();

  return (
    <>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage theme={theme} />} />
          <Route path="/dashboard" element={<Dashboard theme={theme} />} />
          <Route path="/plan-health" element={<PlanHealthPage theme={theme} />} />
          <Route path="/what-if" element={<WhatIfPage theme={theme} />} />
          <Route path="/audit-log" element={<AuditLogPage theme={theme} />} />
          <Route path="/field-report" element={<FieldReportPage theme={theme} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </>
  );
}

function App() {
  const [theme, setTheme] = useState('dark');

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      document.documentElement.classList.remove('dark');
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
