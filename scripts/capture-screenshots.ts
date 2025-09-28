import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport for consistent screenshots
  await page.setViewportSize({ width: 1440, height: 900 });

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, '../docs/src/assets/screenshots');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  console.log('Navigating to application...');
  await page.goto('http://localhost:5175');
  await page.waitForLoadState('networkidle');

  // 1. Dashboard screenshot
  console.log('Taking Dashboard screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'dashboard-guilds.png'),
    fullPage: true
  });

  // 2. Navigate to Debug Messages
  await page.click('text=Debug Messages');
  await page.waitForTimeout(1000);

  // Select a guild by clicking on the card
  await page.click('h3:has-text("Test Guild")');
  await page.waitForTimeout(2000);

  // 3. List view screenshot (default view)
  console.log('Taking List view screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'debug-list-view.png'),
    fullPage: true
  });

  // 4. Switch to Thread view
  console.log('Switching to Thread view...');
  // The view buttons are in a div with border rounded-lg p-1 classes
  // Thread view button is the second button (with GitBranch icon)
  await page.click('.border.rounded-lg.p-1 button:nth-child(2)');
  await page.waitForTimeout(2000);

  // Verify we're in thread view
  const threadElements = await page.$$('text=/Thread.*messages/');
  if (threadElements.length > 0) {
    console.log('Successfully switched to Thread view');
  } else {
    console.log('Warning: May not have switched to Thread view properly');
  }

  console.log('Taking Thread view screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'debug-thread-view.png'),
    fullPage: true
  });

  // 5. Switch to Graph view
  console.log('Switching to Graph view...');
  // Graph view button is the third button (with Network icon)
  await page.click('.border.rounded-lg.p-1 button:nth-child(3)');
  await page.waitForTimeout(3000); // Give graph time to render

  // Verify we're in graph view by checking for canvas or graph-specific elements
  const canvasElements = await page.$$('canvas');
  const svgElements = await page.$$('svg.react-flow__edges');
  if (canvasElements.length > 0 || svgElements.length > 0) {
    console.log('Successfully switched to Graph view');
  } else {
    console.log('Warning: May not have switched to Graph view properly');
  }

  console.log('Taking Graph view screenshot...');
  await page.screenshot({
    path: path.join(screenshotsDir, 'debug-graph-view.png'),
    fullPage: true
  });

  console.log('Screenshots captured successfully!');
  console.log(`Screenshots saved to: ${screenshotsDir}`);

  // Verify the files
  const files = fs.readdirSync(screenshotsDir);
  console.log('Created files:', files);

  // Check file sizes to ensure different content
  for (const file of files) {
    const stats = fs.statSync(path.join(screenshotsDir, file));
    console.log(`${file}: ${(stats.size / 1024).toFixed(2)} KB`);
  }

  await browser.close();
}

captureScreenshots().catch(console.error);