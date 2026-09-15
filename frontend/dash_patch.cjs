const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

// Replace Priority Queue items
const oldStart = `<motion.div 
                            key={hab.habitation_id}
                            variants={{`;
const newStart = `<motion.div 
                            key={hab.habitation_id}
                            variants={{
                              hidden: { opacity: 0, y: 10 },
                              visible: { opacity: 1, y: 0 }
                            }}
                            animate={hasChanged ? { 
                              y: [0, -5, 0],
                              boxShadow: ['0 0 0px rgba(0,0,0,0)', \`0 0 20px \${bandColor}\`, '0 0 0px rgba(0,0,0,0)']
                            } : "visible"}
                            transition={hasChanged ? { duration: 1.5, repeat: 3 } : {}}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setSelectedHab(hab.habitation_id)}
                            style={{ marginBottom: '8px' }}
                          >
                            <MagicCard
                              className="cursor-pointer flex flex-col"
                              gradientColor={theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                              style={{
                                padding: '12px 16px', 
                                border: \`1px solid \${isSelected ? 'rgba(56, 189, 248, 0.5)' : 'var(--item-border)'}\`,
                                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'var(--item-bg)',
                                borderRadius: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>`;

// Find the start of the item mapping
const mapStart = c.indexOf('{sortedHabs.map(hab => {');
if (mapStart !== -1) {
    const startDiv = c.indexOf('<motion.div', mapStart);
    const innerDivStart = c.indexOf('<div style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', marginBottom: \'8px\' }}>', startDiv);
    
    if (innerDivStart !== -1) {
        c = c.substring(0, startDiv) + newStart + c.substring(innerDivStart + '<div style={{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\', marginBottom: \'8px\' }}>'.length);
    }
}

// Find closing tag of the mapped item
const oldEnd = `                              )}
                            </div>
                          </motion.div>`;
const newEnd = `                              )}
                            </div>
                            </MagicCard>
                          </motion.div>`;
                          
c = c.replace(oldEnd, newEnd);

fs.writeFileSync('src/pages/Dashboard.jsx', c);
console.log('Dashboard MagicCard patched');
