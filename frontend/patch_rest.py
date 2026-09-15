import os

def patch(file_path, replacements):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            print(f"Patched {file_path}")
        else:
            print(f"Failed to find string in {file_path}:\n{old[:50]}...")
            
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# ── AuditLogPage ──
patch('src/pages/AuditLogPage.jsx', [
    (
        'import { ShimmerButton } from "@/components/ui/shimmer-button";',
        'import { ShimmerButton } from "@/components/ui/shimmer-button";\nimport { MagicCard } from "@/components/ui/magic-card";\nimport MeshBackground from "../components/MeshBackground";'
    ),
    (
        'className="min-h-screen pt-28 pb-16"',
        'className="min-h-screen pt-28 pb-16 relative overflow-hidden"\n    >\n      <MeshBackground />'
    ),
    (
        '''        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-2xl"
        >
          <div className="overflow-x-auto">''',
        '''        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden shadow-2xl"
        >
          <MagicCard gradientColor="rgba(255,255,255,0.08)" className="border-white/10 bg-white/[0.02]">
          <div className="overflow-x-auto relative z-10">'''
    ),
    (
        '''          </div>
        </motion.div>''',
        '''          </div>
          </MagicCard>
        </motion.div>'''
    )
])

# ── Dashboard ──
patch('src/pages/Dashboard.jsx', [
    (
        '''import { motion, AnimatePresence } from 'framer-motion';''',
        '''import { motion, AnimatePresence } from 'framer-motion';\nimport { MagicCard } from '../components/ui/magic-card';\nimport MeshBackground from '../components/MeshBackground';'''
    ),
    (
        '''    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-light)', overflow: 'hidden' }} className={`${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>''',
        '''    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'transparent', color: 'var(--text-light)', overflow: 'hidden' }} className={`${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>\n      <MeshBackground />'''
    ),
    (
        '''                        <motion.div 
                          key={hab.habitation_id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => setSelectedHab(hab.habitation_id)}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: hab.habitation_id === selectedHab ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                            borderLeft: `4px solid ${riskColor}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            transition: 'all 0.2s',
                          }}
                        >''',
        '''                        <motion.div 
                          key={hab.habitation_id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => setSelectedHab(hab.habitation_id)}
                          style={{ cursor: 'pointer', overflow: 'hidden', borderRadius: '8px', borderLeft: `4px solid ${riskColor}` }}
                        >
                          <MagicCard gradientColor="rgba(255,255,255,0.1)" className="w-full h-full">
                          <div style={{
                            padding: '12px 16px',
                            backgroundColor: hab.habitation_id === selectedHab ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            position: 'relative',
                            zIndex: 10,
                          }}>'''
    ),
    (
        '''                        </motion.div>''',
        '''                          </div>\n                          </MagicCard>\n                        </motion.div>'''
    ),
    (
        '''    <Link key={to} to={to} style={{ display: 'block', padding: '10px 14px', backgroundColor: accent, borderRadius: '10px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border, transition: 'all 0.2s' }}>''',
        '''    <motion.div key={to} whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(255,255,255,0.15)' }} transition={{ duration: 0.2 }}>\n    <Link to={to} style={{ display: 'block', padding: '10px 14px', backgroundColor: accent, borderRadius: '10px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border, transition: 'all 0.2s' }}>'''
    ),
    (
        '''    </Link>
  ))''',
        '''    </Link>\n    </motion.div>\n  ))'''
    )
])
