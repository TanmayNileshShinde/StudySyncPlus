/* Batched capture round: desktop 1440 + mobile 390 + state captures. */
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
    await page.waitForTimeout(900); // settle entrance motion
    if (actions) await actions(page);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
    await page.close();
    console.log(`captured ${name}`);
  }

  await capture('desktop', { width: 1440, height: 900 });
  await capture('mobile', { width: 390, height: 844 });

  await capture('tab-analytics', {
    width: 1440,
    height: 900,
    actions: async (p) => {
      await p.getByRole('button', { name: 'Visual Analytics' }).click();
      await p.waitForTimeout(700);
    }
  });

  await capture('tab-scheme', {
    width: 1440,
    height: 900,
    actions: async (p) => {
      await p.getByRole('button', { name: 'Sem 3 Scheme' }).click();
      await p.waitForTimeout(500);
    }
  });

  await capture('tab-lab', {
    width: 1440,
    height: 900,
    actions: async (p) => {
      await p.getByRole('button', { name: 'Async & JS Lab' }).click();
      await p.waitForTimeout(500);
    }
  });

  await capture('tab-syllabus', {
    width: 1440,
    height: 900,
    actions: async (p) => {
      await p.getByRole('button', { name: 'Syllabus & Viva' }).click();
      await p.waitForTimeout(500);
    }
  });

  await capture('overlay-upload', {
    width: 1440,
    height: 900,
    fullPage: false,
    actions: async (p) => {
      await p.getByRole('button', { name: /Upload/ }).first().click();
      await p.waitForTimeout(500);
    }
  });

  await capture('overlay-bookmarks', {
    width: 1440,
    height: 900,
    fullPage: false,
    actions: async (p) => {
      await p.getByRole('button', { name: /^Saved/ }).first().click();
      await p.waitForTimeout(500);
    }
  });

  await capture('overlay-detail', {
    width: 1440,
    height: 900,
    fullPage: false,
    actions: async (p) => {
      await p.locator('article').first().click();
      await p.waitForTimeout(500);
    }
  });

  // ESC-close + scroll-lock behavior check
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Upload/ }).first().click();
    await page.waitForTimeout(400);
    const locked = await page.evaluate(() => document.body.style.overflow === 'hidden');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const closed = (await page.locator('[role="dialog"]').count()) === 0;
    const unlocked = await page.evaluate(() => document.body.style.overflow !== 'hidden');
    console.log(`behavior: scroll-lock=${locked} esc-closes=${closed} unlock=${unlocked}`);
    await page.close();
  }

  console.log(errors.length ? `JS ERRORS:\n${errors.join('\n')}` : 'no js errors');
  await browser.close();
})();
