const fs = require('fs');
let dash = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');
// Fix named import
dash = dash.replace(
  `import NumberTicker from '../components/ui/number-ticker';`,
  `import { NumberTicker } from '../components/ui/number-ticker';`
);
// Also fix the duplicate import if it was added twice
const count = (dash.match(/number-ticker/g) || []).length;
console.log('number-ticker occurrences:', count);
fs.writeFileSync('src/pages/Dashboard.jsx', dash);
console.log('Fixed NumberTicker import');
