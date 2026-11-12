/* Capture round for the refined library composition. */
const { chromium } = require('playwright');

const BASE = 'http://localhost:5174';
const OUT = '.impeccable/review';

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  async function capture(name, { width, height, fullPage = true, actions } = {}) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`);
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    if (actions) await actions(page);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
    await page.close();
    console.log(`captured ${name}`);
  }

  await capture('desktop-v2', { width: 1440, height: 900 });
  await capture('tablet-v2', { width: 834, height: 1112 });
  await capture('mobile-v2', { width: 390, height: 844 });

  // Quick sanity: sort interaction actually reorders (count flash + first card title)
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.selectOption('select[aria-label="Sort resources"]', 'downloads');
    await page.waitForTimeout(300);
    const firstTitle = await page.locator('article h3').first().textContent();
    console.log(`sort-check: first card after "Most downloaded" = ${firstTitle.trim()}`);
    await page.close();
  }

  console.log(errors.length ? `JS ERRORS:\n${errors.join('\n')}` : 'no js errors');
  await browser.close();
})();
