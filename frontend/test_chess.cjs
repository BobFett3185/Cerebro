const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Navigate to local app
  await page.goto('http://localhost:5173/chess'); // Adjust port if needed

  // Wait for the chessboard to load
  await page.waitForSelector('[data-square="e2"]');

  // Listen to console events
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));

  // Simulate Drag and Drop from e2 to e4
  const source = await page.$('[data-square="e2"]');
  const target = await page.$('[data-square="e4"]');

  if (source && target) {
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();

    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
    await page.mouse.up();
  }

  // Wait a bit to observe the board and logs
  await new Promise(r => setTimeout(r, 2000));

  await browser.close();
})();
