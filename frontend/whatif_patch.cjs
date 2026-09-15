const fs = require('fs');
let c = fs.readFileSync('src/pages/WhatIfPage.jsx', 'utf-8');

if (!c.includes('NumberTicker')) {
    c = c.replace(/import \{ Compare \} from "@\/components\/ui\/compare";/, "import { Compare } from \"@/components/ui/compare\";\nimport { NumberTicker } from \"@/components/ui/number-ticker\";");
}

// Replace the baseline number
c = c.replace(/\{simResult\?\.current_total_unmet_demand\}/g, '<NumberTicker value={simResult?.current_total_unmet_demand || 0} />');
c = c.replace(/\{simResult\?\.total_unmet_demand\}/g, '<NumberTicker value={simResult?.total_unmet_demand || 0} />');

fs.writeFileSync('src/pages/WhatIfPage.jsx', c);
console.log('WhatIfPage patched!');
