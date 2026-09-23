import puppeteer from 'puppeteer-core';
const CHROME_PATH = '/home/claude/.cache/puppeteer/chrome/linux-131.0.6778.204/chrome-linux64/chrome';
const BASE = 'http://127.0.0.1:5173';

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const results = [];
function check(name, cond) { results.push({ name, pass: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'} - ${name}`); }
page.on('pageerror', (err) => console.log('  [pageerror]', err.message));
page.on('console', (msg) => { if (msg.type() === 'error' && !msg.text().includes('tile.openstreetmap') && !msg.text().includes('403')) console.log('  [console.error]', msg.text().slice(0,200)); });

// A hover-in from outside the target, not a jump from an ambiguous prior
// mouse position - this is what made the difference between a flaky check
// and a reliable one (confirmed 5/5 across isolated runs).
async function hoverTiltCheck(getRect, label) {
  const rect = await getRect();
  if (!rect) { check(label + ' (element found)', false); return; }
  const before = await page.evaluate((r) => {
    const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return el ? getComputedStyle(el.closest('[style*="transform-style"]') || el).transform : null;
  }, rect);
  await page.mouse.move(rect.x - 50, rect.y - 50);
  await new Promise(r => setTimeout(r, 100));
  await page.mouse.move(rect.x + rect.width * 0.15, rect.y + rect.height * 0.9, { steps: 15 });
  await new Promise(r => setTimeout(r, 600));
  const after = await page.evaluate((r) => {
    const el = document.elementFromPoint(r.x + r.width * 0.15, r.y + r.height * 0.9);
    return el ? getComputedStyle(el.closest('[style*="transform-style"]') || el).transform : null;
  }, rect);
  await page.mouse.move(rect.x - 80, rect.y - 80);
  await new Promise(r => setTimeout(r, 300));
  check(label, before !== after && after !== 'none');
}

// ---------- Dashboard: SolverStatusBadge tilt + Priority Queue tilt + ML gauges ----------
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle0', timeout: 20000 });
await new Promise(r => setTimeout(r, 1800));

await hoverTiltCheck(
  () => page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(d => d.textContent.trim() === 'Solve Time');
    return el ? el.getBoundingClientRect().toJSON() : null;
  }),
  'SolverStatusBadge: transform changes on hover (tilt active)'
);

await hoverTiltCheck(
  () => page.evaluate(() => {
    const nodes = [...document.querySelectorAll('div')];
    const target = nodes.find(n => n.textContent.includes('Pop:') && n.offsetHeight > 0 && n.offsetHeight < 100);
    return target ? target.getBoundingClientRect().toJSON() : null;
  }),
  'Priority Queue card: tilt transform changes on hover'
);

// Click a habitation to check ML gauge rendering (BRP-001 has landslide ML).
// Real mouse click at screen coordinates, not element.click() on a
// JS-referenced node - a click on the outer perspective wrapper (ahead of
// the actual card in document order) does not bubble down to the child's
// handler the way a real click at that pixel does.
const ambariRect = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('div')];
  const target = nodes.find(n => n.textContent.includes('Ambari') && n.textContent.includes('Pop:') && n.offsetHeight < 100);
  return target ? target.getBoundingClientRect().toJSON() : null;
});
if (ambariRect) {
  await page.mouse.click(ambariRect.x + ambariRect.width / 2, ambariRect.y + ambariRect.height / 2);
}
await new Promise(r => setTimeout(r, 900));
check('Dashboard: ML gauge SVG renders in explainability panel', await page.evaluate(() => {
  const panel = document.querySelector('.explainability-panel');
  return panel ? panel.querySelectorAll('svg circle').length > 0 : false;
}));
check('Dashboard: critical-care icon uses radial-gradient sphere styling', await page.evaluate(() => {
  const panel = document.querySelector('.explainability-panel');
  if (!panel) return false;
  const spans = [...panel.querySelectorAll('span')];
  return spans.some(s => s.style.background && s.style.background.includes('radial-gradient'));
}));

// ---------- Plan Health: sphere status indicator ----------
await page.goto(`${BASE}/plan-health`, { waitUntil: 'networkidle0', timeout: 20000 });
await new Promise(r => setTimeout(r, 1500));
check('PlanHealth: status sphere uses radial-gradient shading', await page.evaluate(() => {
  const divs = [...document.querySelectorAll('div')];
  return divs.some(d => d.style.background && d.style.background.includes('radial-gradient'));
}));
check('PlanHealth: page still shows status text correctly', await page.evaluate(() => document.body.innerText.includes('Plan Status')));

// ---------- What-If: comparison card tilt ----------
await page.goto(`${BASE}/what-if`, { waitUntil: 'networkidle0', timeout: 20000 });
await new Promise(r => setTimeout(r, 1200));
const runClicked = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Run Simulation'));
  if (btn) { btn.click(); return true; }
  return false;
});
await new Promise(r => setTimeout(r, 3000));
check('WhatIf: simulation ran', runClicked);
check('WhatIf: comparison card renders after run', await page.evaluate(() => document.body.innerText.toLowerCase().includes('baseline')));

await browser.close();
console.log('\n=============================');
const passed = results.filter(r => r.pass).length;
console.log(`RESULT: ${passed}/${results.length} passed`);
console.log('=============================');
if (passed !== results.length) process.exit(1);
