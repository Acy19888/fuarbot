import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => {
    console.log("PAGE ERROR:", err.message);
    console.log("STACK:", err.stack);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') console.log("CONSOLE ERROR:", msg.text());
  });
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  await browser.close();
})();
