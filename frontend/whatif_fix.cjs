const fs = require('fs');
let c = fs.readFileSync('src/pages/WhatIfPage.jsx', 'utf-8');

// Replace Compare import
c = c.replace(/import \{ Compare \} from "@\/components\/ui\/compare";\n/, '');

// Fix NaN% in Slider
c = c.replace(/\+\{\(\(multiplier\[0\] - 1\) \* 100\)\.toFixed\(0\)\}%/, '+{(((multiplier?.[0] || 1.0) - 1) * 100).toFixed(0)}%');
c = c.replace(/\{hazardScore\[0\]\.toFixed\(2\)\}/, '{(hazardScore?.[0] || 0.5).toFixed(2)}');

// Replace the Compare component section
const oldCompare = `<div className="flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative h-[400px]">
                <Compare 
                  firstImage={<BaselineCard />}
                  secondImage={<SimulatedCard />}
                  firstImageClassName="object-cover"
                />
                
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs font-medium text-slate-300 z-50">
                  Hover or drag to compare
                </div>
              </div>`;

const newCompare = `<div className="flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative flex flex-col md:flex-row h-[400px]">
                <div className="flex-1 h-full border-r border-white/10 relative">
                  <BaselineCard />
                </div>
                <div className="flex-1 h-full relative bg-indigo-950/20">
                  <SimulatedCard />
                </div>
              </div>`;

c = c.replace(oldCompare, newCompare);

fs.writeFileSync('src/pages/WhatIfPage.jsx', c);
console.log('WhatIfPage fixed!');
