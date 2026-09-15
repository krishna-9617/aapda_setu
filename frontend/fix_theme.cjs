const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');
code = code.replace('const Dashboard = () => {', 'const Dashboard = ({ theme }) => {');
code = code.replace("const [theme, setTheme] = useState('dark');", "");
fs.writeFileSync('src/pages/Dashboard.jsx', code);
console.log('Fixed Dashboard theme prop');
