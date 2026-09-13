import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon } from "lucide-react";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";

const Navbar = ({ theme, toggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const toggleMenu = () => setIsOpen(!isOpen);

  const links = [
    { name: "Home", path: "/" },
    { name: "Live Dashboard", path: "/dashboard" },
    { name: "Plan Health", path: "/plan-health" },
    { name: "What-If Analysis", path: "/what-if" },
    { name: "Field Report", path: "/field-report" },
    { name: "Audit Log", path: "/audit-log" }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 9999,
      display: 'flex', justifyContent: 'center',
      padding: '24px 16px',
      pointerEvents: 'none'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
        backgroundColor: theme === 'dark' ? 'rgba(18, 18, 18, 0.4)' : 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '9999px',
        boxShadow: theme === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.5)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '1200px',
        pointerEvents: 'auto'
      }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <motion.div
              style={{
                width: '36px', height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1 0%, #059669 100%)',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.6)'
              }}
              animate={{ 
                scale: [1, 1.05, 1],
                boxShadow: ['0 0 15px rgba(99,102,241,0.4)', '0 0 25px rgba(99,102,241,0.8)', '0 0 15px rgba(99,102,241,0.4)']
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              whileHover={{ rotate: 90, scale: 1.1, transition: { duration: 0.3 } }}
            />
            <div className="hidden sm:block ml-4 mr-6">
              <AnimatedGradientText className="!bg-transparent !p-0 border-none shadow-none text-xl font-bold tracking-tight px-2 py-0">
                Aapda Setu
              </AnimatedGradientText>
            </div>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="hidden md:flex">
          {links.map((item) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ y: -2 }}
            >
              <Link
                to={item.path}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: location.pathname === item.path 
                    ? (theme === 'dark' ? '#F8FAFC' : '#0F172A')
                    : (theme === 'dark' ? '#94A3B8' : '#64748B'),
                  transition: 'color 0.2s ease'
                }}
              >
                {item.name}
              </Link>
            </motion.div>
          ))}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={toggleTheme}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <button 
            className="md:hidden flex items-center justify-center text-current bg-transparent border-none cursor-pointer"
            onClick={toggleMenu}
            style={{ color: theme === 'dark' ? '#F8FAFC' : '#0F172A' }}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute', top: '80px', left: '16px', right: '16px',
              backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '24px',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              pointerEvents: 'auto',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
            className="md:hidden"
          >
            {links.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: location.pathname === item.path 
                    ? '#6366F1'
                    : (theme === 'dark' ? '#F8FAFC' : '#0F172A'),
                  padding: '12px 0',
                  borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                }}
              >
                {item.name}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
