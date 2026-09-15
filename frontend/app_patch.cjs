const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf-8');

c = c.replace(/const \[theme, setTheme\] = useState\('dark'\);/, `const [theme, setTheme] = useState('dark');

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
  }, [theme]);`);

c = c.replace(/<Route path="\/dashboard" element=\{<Dashboard \/>\} \/>/, '<Route path="/dashboard" element={<Dashboard theme={theme} />} />');
c = c.replace(/<Route path="\/plan-health" element=\{<PlanHealthPage \/>\} \/>/, '<Route path="/plan-health" element={<PlanHealthPage theme={theme} />} />');
c = c.replace(/<Route path="\/what-if" element=\{<WhatIfPage \/>\} \/>/, '<Route path="/what-if" element={<WhatIfPage theme={theme} />} />');
c = c.replace(/<Route path="\/audit-log" element=\{<AuditLogPage \/>\} \/>/, '<Route path="/audit-log" element={<AuditLogPage theme={theme} />} />');

fs.writeFileSync('src/App.jsx', c);
console.log('App.jsx patched for global theme!');
