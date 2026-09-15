const { execSync } = require('child_process');
const fs = require('fs');

const orig = execSync('git show 879ef1d05cd853a83bafe932263afcf48a318781:frontend/src/index.css', { encoding: 'utf-8' });
const curr = fs.readFileSync('src/index.css', 'utf-8');

// Strip out the initial @import to avoid issues
let appended = orig.replace(/@import.*\n/, '');

const combined = curr + "\n/* --- RESTORED DASHBOARD CSS --- */\n" + appended;
fs.writeFileSync('src/index.css', combined);
console.log("Appended git CSS correctly.");
