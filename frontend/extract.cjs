const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\hp\\.gemini\\antigravity\\brain\\a68fc7c5-a6e7-422c-b17a-64cc28896e56\\.system_generated\\steps\\3096\\content.md', 'utf-8');
const regex = /"code":"([^"]+)"/g;
let match;
let i = 0;
while ((match = regex.exec(content)) !== null) {
  if (i >= 5) break;
  let code = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
  console.log(`--- MATCH ${i} ---`);
  console.log(code.substring(0, 500));
  i++;
}
