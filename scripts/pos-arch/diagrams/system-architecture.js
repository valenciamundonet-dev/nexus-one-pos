
    const { chromium } = require('playwright');
    (async () => {
      const browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 1200, height: 850 } });
      await page.goto('file:///home/z/my-project/scripts/pos-arch/diagrams/system-architecture.html');
      await page.waitForTimeout(300);
      await page.screenshot({ path: '/home/z/my-project/scripts/pos-arch/diagrams/system-architecture.png', scale: 'device', deviceScaleFactor: 2 });
      await browser.close();
    })();
    