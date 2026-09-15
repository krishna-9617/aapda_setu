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

# ── WhatIfPage ──
patch('src/pages/WhatIfPage.jsx', [
    (
        'import { Beaker, Play, CheckCircle2, GripVertical } from "lucide-react";\nimport { API_BASE_URL } from "../config";\nimport MapView from "../components/MapView";\nimport MeshBackground from \'../components/MeshBackground\';',
        'import { Beaker, Play, CheckCircle2, GripVertical } from "lucide-react";\nimport { API_BASE_URL } from "../config";\nimport MapView from "../components/MapView";\nimport MeshBackground from \'../components/MeshBackground\';\nimport { MagicCard } from "@/components/ui/magic-card";'
    ),
    (
        '''  // Resizable panel
  const [leftPct, setLeftPct] = useState(40);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const startDrag = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(20, Math.min(75, (x / rect.width) * 100));
    setLeftPct(pct);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [onMouseMove, stopDrag]);''',
        '''  // Resizable panel
  const [leftPct, setLeftPct] = useState(40);
  const containerRef = useRef(null);
  const leftPanelRef = useRef(null);
  const isDragging = useRef(false);
  const liveLeftPct = useRef(40);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const startDrag = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopDrag = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    setLeftPct(liveLeftPct.current);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current || !leftPanelRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(20, Math.min(75, ((e.clientX - rect.left) / rect.width) * 100));
    liveLeftPct.current = pct;
    leftPanelRef.current.style.width = pct + '%';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [onMouseMove, stopDrag]);'''
    ),
    (
        '''        <div
          style={{ width: `${leftPct}%` }}
          className="overflow-y-auto shrink-0 p-6 lg:p-8"
        >
          <div className="space-y-6">''',
        '''        <div
          ref={leftPanelRef}
          style={{ width: `${leftPct}%` }}
          className="overflow-y-auto shrink-0 p-6 lg:p-8"
        >
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">'''
    ),
    (
        '''            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">What-If Analysis</h1>''',
        '''            <motion.div variants={staggerItem}>
              <h1 className="text-3xl font-bold tracking-tight mb-2">What-If Analysis</h1>'''
    ),
    (
        '''              <p className="text-sm text-slate-400 max-w-lg">
                Simulate demand spikes and test infrastructure configurations before applying them.
              </p>
            </div>''',
        '''              <p className="text-sm text-slate-400 max-w-lg">
                Simulate demand spikes and test infrastructure configurations before applying them.
              </p>
            </motion.div>'''
    ),
    (
        '''            {/* Parameters Card */}
            <div className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/10 space-y-4 relative overflow-hidden">''',
        '''            {/* Parameters Card */}
            <motion.div variants={staggerItem} className="rounded-xl overflow-hidden">
            <MagicCard gradientColor="rgba(255,255,255,0.1)" className="p-5 bg-white/[0.03] border-white/10 relative">
            <div className="relative z-10 space-y-4">'''
    ),
    (
        '''                Run Simulation
              </button>
            </div>''',
        '''                Run Simulation
              </motion.button>
            </div>
            </div>
            </MagicCard>
            </motion.div>'''
    ),
    (
        '''              <button
                onClick={handleSimulate}
                disabled={isSimulating || isImplementing}''',
        '''              <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(99,102,241,0.5)' }}
                onClick={handleSimulate}
                disabled={isSimulating || isImplementing}'''
    ),
    (
        '''            {simResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-white/[0.03] backdrop-blur-sm border border-indigo-500/30"
              >''',
        '''            {simResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                variants={staggerItem}
                className="rounded-xl overflow-hidden"
              >
              <MagicCard gradientColor="rgba(255,255,255,0.1)" className="p-5 bg-white/[0.03] border-indigo-500/30">
              <div className="relative z-10">'''
    ),
    (
        '''                  Implement This Plan
                </button>
              </motion.div>
            )}
          </div>
        </div>''',
        '''                  Implement This Plan
                </motion.button>
              </div>
              </MagicCard>
              </motion.div>
            )}
          </motion.div>
        </div>'''
    ),
    (
        '''                <button
                  onClick={handleImplement}
                  disabled={isSimulating || isImplementing}''',
        '''                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(16,185,129,0.5)' }}
                  onClick={handleImplement}
                  disabled={isSimulating || isImplementing}'''
    )
])
