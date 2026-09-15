const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:\\Users\\hp\\.cache\\puppeteer\\chrome\\win64-152.0.7977.75\\chrome-win64\\chrome.exe' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto('http://localhost:5176/dashboard');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'dashboard.png' });

  await page.goto('http://localhost:5176/plan-health');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'plan-health.png' });

  await page.goto('http://localhost:5176/what-if');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'what-if.png' });

  await page.goto('http://localhost:5176/audit-log');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'audit-log.png' });

  await browser.close();
  console.log('Screenshots saved');
})();
