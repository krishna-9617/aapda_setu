import React, { useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, ChevronDown } from "lucide-react";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";

// Nine destinations no longer fit comfortably in a flat row, so related pages
// are grouped under a shared dropdown. Every existing link keeps its own
// route unchanged - this only changes how they're reached, not what exists.
const NAV_GROUPS = [
  { type: "link", name: "Home", path: "/" },
  {
    type: "group",
    name: "Operations",
    paths: ["/dashboard", "/plan-health", "/what-if", "/field-report"],
    items: [
      { name: "Live Dashboard", path: "/dashboard" },
      { name: "Plan Health", path: "/plan-health" },
      { name: "What-If Analysis", path: "/what-if" },
      { name: "Field Report", path: "/field-report" },
    ],
  },
  {
    type: "group",
    name: "Data",
    paths: ["/habitations", "/sites"],
    items: [
      { name: "Vulnerable Habitations", path: "/habitations" },
      { name: "Relocation Sites", path: "/sites" },
    ],
  },
  { type: "link", name: "Audit Log", path: "/audit-log" },
  { type: "link", name: "About", path: "/about" },
];

// Flat list for the mobile overlay, with section headers.
const MOBILE_SECTIONS = [
  { heading: null, items: [{ name: "Home", path: "/" }] },
  {
    heading: "Operations",
    items: [
      { name: "Live Dashboard", path: "/dashboard" },
      { name: "Plan Health", path: "/plan-health" },
      { name: "What-If Analysis", path: "/what-if" },
      { name: "Field Report", path: "/field-report" },
    ],
  },
  {
    heading: "Data",
    items: [
      { name: "Vulnerable Habitations", path: "/habitations" },
      { name: "Relocation Sites", path: "/sites" },
    ],
  },
  { heading: null, items: [{ name: "Audit Log", path: "/audit-log" }, { name: "About", path: "/about" }] },
];

function NavDropdown({ group, isDark, isActiveGroup }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const scheduleClose = () => {
    // A short delay rather than an instant close, so moving the mouse from
    // the trigger down into the menu doesn't clip the hover and close it
    // before the menu is reached.
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "transparent", border: "none", cursor: "pointer",
          fontSize: 14, fontWeight: 500, padding: 0,
          color: isActiveGroup
            ? (isDark ? "#F8FAFC" : "#0F172A")
            : (isDark ? "#94A3B8" : "#64748B"),
        }}
      >
        {group.name}
        <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", top: "calc(100% + 16px)", left: "50%", transform: "translateX(-50%)",
              minWidth: 200, padding: 8, borderRadius: 14,
              background: isDark ? "rgba(15, 23, 42, 0.97)" : "rgba(255, 255, 255, 0.97)",
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
              zIndex: 20,
            }}
          >
            {group.items.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                style={{
                  display: "block", padding: "9px 14px", borderRadius: 9,
                  fontSize: 13.5, fontWeight: 500, textDecoration: "none",
                  color: isDark ? "#E2E8F0" : "#1E293B",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {item.name}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const Navbar = ({ theme, toggleTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const toggleMenu = () => setIsOpen(!isOpen);
  const isDark = theme === "dark";

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
        <nav style={{ display: 'flex', alignItems: 'center', gap: '28px' }} className="hidden md:flex">
          {NAV_GROUPS.map((entry) => {
            if (entry.type === "link") {
              return (
                <motion.div
                  key={entry.name}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ y: -2 }}
                >
                  <Link
                    to={entry.path}
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      textDecoration: 'none',
                      color: location.pathname === entry.path
                        ? (isDark ? '#F8FAFC' : '#0F172A')
                        : (isDark ? '#94A3B8' : '#64748B'),
                      transition: 'color 0.2s ease'
                    }}
                  >
                    {entry.name}
                  </Link>
                </motion.div>
              );
            }
            return (
              <NavDropdown
                key={entry.name}
                group={entry}
                isDark={isDark}
                isActiveGroup={entry.paths.includes(location.pathname)}
              />
            );
          })}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
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
              padding: '20px 24px',
              border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              pointerEvents: 'auto',
              display: 'flex', flexDirection: 'column', gap: '4px',
              maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
            }}
            className="md:hidden"
          >
            {MOBILE_SECTIONS.map((section, si) => (
              <div key={si} style={{ marginTop: si > 0 ? 10 : 0 }}>
                {section.heading && (
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: isDark ? '#64748B' : '#94A3B8', padding: '8px 0 4px 0' }}>
                    {section.heading}
                  </div>
                )}
                {section.items.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      color: location.pathname === item.path
                        ? '#6366F1'
                        : (theme === 'dark' ? '#F8FAFC' : '#0F172A'),
                      padding: '10px 0',
                      display: 'block',
                      borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)'
                    }}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
