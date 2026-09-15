const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');
if (!c.includes('MagicCard')) {
    c = c.replace(/import \{ Link \} from 'react-router-dom';/, "import { Link } from 'react-router-dom';\nimport { MagicCard } from '@/components/ui/magic-card';");
    fs.writeFileSync('src/pages/Dashboard.jsx', c);
}
