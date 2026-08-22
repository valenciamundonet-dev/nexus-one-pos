
    const { chromium } = require('playwright');
    (async () => {
      const browser = await chromium.launch();
      const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
      await page.goto('file:///home/z/my-project/scripts/pos-arch/diagrams/ux-pos-layout.html');
      await page.waitForTimeout(300);
      await page.screenshot({ path: '/home/z/my-project/scripts/pos-arch/diagrams/ux-pos-layout.png', scale: 'device', deviceScaleFactor: 2 });
      await browser.close();
    })();
    