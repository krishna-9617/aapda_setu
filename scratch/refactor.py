import os
import re

files = [
    'frontend/src/pages/Dashboard.jsx',
    'frontend/src/components/EventControls.jsx',
    'frontend/src/components/SolverStatusBadge.jsx'
]

replacements = [
    (r"'#0b0f19'", "'var(--bg)'"),
    (r"'linear-gradient\(135deg, #0b0f19 0%, #111827 50%, #0d1322 100%\)'", "'var(--bg-grad)'"),
    (r"'#f3f4f6'", "'var(--text)'"),
    (r"'#f8fafc'", "'var(--text-light)'"),
    (r"'#94a3b8'", "'var(--text-muted)'"),
    (r"'#cbd5e1'", "'var(--text-tertiary)'"),
    (r"'#e2e8f0'", "'var(--text-strong)'"),
    (r"'rgba\(15, 23, 42, 0\.75\)'", "'var(--panel-bg)'"),
    (r"'rgba\(255, 255, 255, 0\.12\)'", "'var(--panel-border)'"),
    (r"'rgba\(255, 255, 255, 0\.1\)'", "'var(--panel-border-light)'"),
    (r"'rgba\(255, 255, 255, 0\.05\)'", "'var(--item-border)'"),
    (r"'rgba\(255,255,255,0\.05\)'", "'var(--item-border)'"),
    (r"'rgba\(255, 255, 255, 0\.03\)'", "'var(--item-bg)'"),
    (r"'rgba\(0, 0, 0, 0\.6\)'", "'var(--shadow)'"),
    (r"'rgba\(0, 0, 0, 0\.2\)'", "'var(--inner-bg)'"),
    (r"'rgba\(0,0,0,0\.2\)'", "'var(--inner-bg)'"),
    (r"'rgba\(255, 255, 255, 0\.08\)'", "'var(--btn-bg)'"),
    (r"'rgba\(0, 0, 0, 0\.3\)'", "'var(--shadow-light)'"),
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Done applying CSS vars')
