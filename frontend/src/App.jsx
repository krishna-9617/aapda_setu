import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import Navbar from './components/Navbar';
import PlanHealthPage from './pages/PlanHealthPage';
import WhatIfPage from './pages/WhatIfPage';
import AuditLogPage from './pages/AuditLogPage';
import './App.css'; 

const PlaceholderPage = ({ title }) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A', color: '#F8FAFC', fontFamily: 'Lexend, sans-serif' }}>
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '16px', color: '#6366F1' }}>{title}</h1>
      <p style={{ color: '#94A3B8' }}>Coming in Phase 2</p>
    </div>
  </div>
);

function App() {
  // Hoist the theme state so the Navbar can toggle it across the whole app
  const [theme, setTheme] = useState('dark');
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <BrowserRouter>
      <div className="App" style={{ backgroundColor: theme === 'dark' ? '#0b0f19' : '#f8fafc' }}>
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        
        {/* We wrap routes that aren't the dashboard in a container to account for the navbar padding if needed, 
            but LandingPage handles its own hero layout. Dashboard is left 100% strictly zero-touch. */}
        <Routes>
          <Route path="/" element={<LandingPage theme={theme} />} />
          
          {/* Dashboard is mounted exactly as it was, receiving the theme from the hoisted state if it wants it,
              but since we aren't modifying Dashboard internally, Dashboard will manage its own internal theme 
              state. Wait, the user said "zero internal changes" to Dashboard. So Dashboard will just mount. */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          <Route path="/plan-health" element={<PlanHealthPage />} />
          <Route path="/what-if" element={<WhatIfPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
