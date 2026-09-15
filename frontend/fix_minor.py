import os
import re

# Fix AuditLog
path = 'src/pages/AuditLogPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()
code = re.sub(r'(import MeshBackground from "../components/MeshBackground";\s*)+', 'import MeshBackground from "../components/MeshBackground";\n', code)
with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

# Re-apply non-PriorityQueue dashboard patches
path = 'src/pages/Dashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\nimport MeshBackground from '../components/MeshBackground';")
code = code.replace(
    "<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-light)', overflow: 'hidden' }} className={`${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>",
    "<div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'transparent', color: 'var(--text-light)', overflow: 'hidden' }} className={`${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>\n      <MeshBackground />"
)

# Replace buttons in dashboard with hover
code = code.replace(
    "    <Link key={to} to={to} style={{ display: 'block', padding: '10px 14px', backgroundColor: accent, borderRadius: '10px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border, transition: 'all 0.2s' }}>",
    "    <motion.div key={to} whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(255,255,255,0.15)' }} transition={{ duration: 0.2 }}>\n    <Link to={to} style={{ display: 'block', padding: '10px 14px', backgroundColor: accent, borderRadius: '10px', color: 'var(--text-light)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, border, transition: 'all 0.2s' }}>"
)
code = code.replace(
    "    </Link>\n  ))",
    "    </Link>\n    </motion.div>\n  ))"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
