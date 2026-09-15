const fs = require('fs');
const orig = fs.readFileSync('original_index.css', 'utf-8');
const curr = fs.readFileSync('src/index.css', 'utf-8');

// Combine the two, but remove the basic :root font-family from orig if it clashes.
// Actually, it's safer to just append orig to curr.
// BUT we should remove any duplicated `body` or `html` rules.

// Just append the variables and custom classes to the end of index.css
let appended = orig.replace(/@import.*\n/, ''); // remove import since tailwind might not like it at the bottom, or we can move it to top

const combined = curr + "\n/* --- RESTORED DASHBOARD CSS --- */\n" + appended;
fs.writeFileSync('src/index.css', combined);
console.log("Restored Dashboard CSS!");
