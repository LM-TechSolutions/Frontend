// Throwaway verification script - not part of the app, deleted after use.
import { chromium } from 'playwright';
import path from 'path';

const shotDir = path.resolve('verify-shots');
await import('fs').then((fs) => fs.mkdirSync(shotDir, { recursive: true }));

const errors = [];

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));

async function shot(name) {
  await page.screenshot({ path: path.join(shotDir, name), fullPage: false });
  console.log('screenshot:', name);
}

console.log('--- login ---');
await page.goto('http://localhost:3002/');
await page.fill('#email', 'admin@tokuma.et');
await page.fill('#password', 'ChangeMe!123');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard', { timeout: 15000 });
console.log('logged in, on dashboard');

console.log('--- drivers page ---');
await page.goto('http://localhost:3002/drivers');
await page.waitForSelector('text=Live Fleet Map', { timeout: 15000 });
await page.waitForTimeout(1500); // let the map + tiles + markers settle
await shot('01-drivers-map.png');

console.log('--- driver detail page ---');
await page.goto('http://localhost:3002/employees/57a7ab54-25af-427b-a871-6311f42100be');
await page.waitForSelector('text=Live Location', { timeout: 15000 });
await page.waitForTimeout(1500);
await shot('02-driver-detail-map.png');
// Click the driver marker to trigger the reverse-geocode popup.
const mapBox = await page.locator('.mapboxgl-canvas, canvas').first().boundingBox();
if (mapBox) {
  await page.mouse.click(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
  await page.waitForTimeout(2000);
  await shot('03-driver-detail-popup.png');
}

console.log('--- new ride route line ---');
await page.goto('http://localhost:3002/dashboard');
await page.waitForSelector('text=NEW RIDE', { timeout: 15000 });
await page.click('text=NEW RIDE');
await page.waitForSelector('text=Set Pickup', { timeout: 10000 });
await page.waitForTimeout(1000);

const rideMapCanvas = await page.locator('.mapboxgl-canvas, canvas').last().boundingBox();
if (!rideMapCanvas) throw new Error('ride creation map canvas not found');

// Click pickup point (left side of map)
await page.mouse.click(rideMapCanvas.x + rideMapCanvas.width * 0.35, rideMapCanvas.y + rideMapCanvas.height * 0.5);
await page.waitForTimeout(800);
// Switch to dropoff
await page.click('text=Set Destination');
await page.waitForTimeout(300);
// Click dropoff point (right side of map, far enough to get a real route)
await page.mouse.click(rideMapCanvas.x + rideMapCanvas.width * 0.7, rideMapCanvas.y + rideMapCanvas.height * 0.3);

console.log('waiting for road route to resolve...');
await page.waitForSelector('text=Road route', { timeout: 20000 }).catch(() => console.log('WARN: "Road route" text never appeared'));
await page.waitForTimeout(1000);
await shot('04-new-ride-route.png');

const routeText = await page.locator('text=/km/').first().textContent().catch(() => null);
console.log('route distance text found:', routeText);

console.log('--- console errors ---');
console.log(errors.length ? errors : 'none');

await browser.close();
console.log('DONE');
