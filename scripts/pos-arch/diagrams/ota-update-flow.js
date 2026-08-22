
    const { chromium } = require('playwright');
    (async () => {
      const browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 1200, height: 500 } });
      await page.goto('file:///home/z/my-project/scripts/pos-arch/diagrams/ota-update-flow.html');
      await page.waitForTimeout(300);
      await page.screenshot({ path: '/home/z/my-project/scripts/pos-arch/diagrams/ota-update-flow.png', scale: 'device', deviceScaleFactor: 2 });
      await browser.close();
    })();
    