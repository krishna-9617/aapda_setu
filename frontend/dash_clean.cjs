const fs = require('fs');
let c = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

// Dashboard should take { theme }
c = c.replace(/const Dashboard = \(\) => \{/, 'const Dashboard = ({ theme }) => {');
// Remove local theme state
c = c.replace(/const \[theme, setTheme\] = useState\('dark'\);[\r\n]*/, '');

// Remove the duplicate header:
const headerStr = `<div style={{ position: 'relative', padding: '24px 24px 24px 72px', borderBottom: '1px solid var(--panel-border-light)', background: 'linear-gradient(to right, rgba(56, 189, 248, 0.1), transparent)' }}>`;
const nextSection = `<div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>`;

const hStart = c.indexOf(headerStr);
const nextStart = c.indexOf(nextSection);

if (hStart !== -1 && nextStart !== -1) {
    c = c.substring(0, hStart) + "\n" + c.substring(nextStart);
}

// Remove Dashboard's top banner if it overlaps Navbar. 
// Wait, Navbar is fixed. Dashboard handles it, but maybe Dashboard needs top padding now?
// Dashboard has: <div className={theme === 'dark' ? 'theme-dark' : 'theme-light'} style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg)', backgroundImage: 'var(--bg-grad)', color: 'var(--text)', fontFamily: 'Inter, sans-serif' }}>
// Let's add paddingTop: '64px' (Navbar height) so it doesn't overlap!
c = c.replace(/style=\{\{ display: 'flex', width: '100vw', height: '100vh'/, `style={{ display: 'flex', width: '100vw', height: '100vh', paddingTop: '64px'`);

// Also DEMO MODE BANNER is fixed at top: 0, which overlaps Navbar. Let's move it to top: 64.
c = c.replace(/<div style=\{\{ position: 'fixed', top: 0, left: 0, right: 0, height: '24px'/, `<div style={{ position: 'fixed', top: '64px', left: 0, right: 0, height: '24px'`);

fs.writeFileSync('src/pages/Dashboard.jsx', c);
console.log('Dashboard patched!');
