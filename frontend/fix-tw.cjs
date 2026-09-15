const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf-8');
css = css.replace(/@theme inline \{[\s\S]*?\}/, '');
fs.writeFileSync('src/index.css', css);

let tw = fs.readFileSync('tailwind.config.js', 'utf-8');
const keyframes = `
        pulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--pulse-color)' },
          '50%': { boxShadow: '0 0 0 8px var(--pulse-color)' },
        },
        'pulse-ripple': {
          '0%': { boxShadow: '0 0 0 0 var(--pulse-color)' },
          '100%': { boxShadow: '0 0 0 12px rgba(255,255,255,0)' },
        },`;
const animations = `
        pulse: 'pulse var(--duration) ease-out infinite',
        'pulse-ripple': 'pulse-ripple var(--duration) ease-out infinite',`;

tw = tw.replace(/keyframes: \{/, 'keyframes: {' + keyframes);
tw = tw.replace(/animation: \{/, 'animation: {' + animations);
fs.writeFileSync('tailwind.config.js', tw);
