import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { access, mkdir, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const runtimeRequire = createRequire("/Users/dattran/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/runtime.js");
const { chromium } = runtimeRequire("playwright");

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const artifactDir = join(rootDir, "artifacts");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png"
};

function serveStatic() {
  const server = createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
    const fullPath = normalize(join(rootDir, pathname));

    if (!fullPath.startsWith(rootDir)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const fileStat = await stat(fullPath);
      if (!fileStat.isFile()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
    } catch {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const stream = createReadStream(fullPath);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(404);
      }
      res.end("Not found");
    });
    res.writeHead(200, { "content-type": mime[extname(fullPath)] || "application/octet-stream" });
    stream.pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, url: `http://127.0.0.1:${address.port}/index.html` });
    });
  });
}

const { server, url } = await serveStatic();
let launchOptions = { headless: true };

try {
  await access(chromePath);
  launchOptions = { ...launchOptions, executablePath: chromePath };
} catch {
  // Fall back to Playwright-managed browsers when they are installed.
}

const browser = await chromium.launch(launchOptions);

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__dashboard?.rowCount > 0);

  const initial = await page.evaluate(() => window.__dashboard);
  assert.equal(initial.summary.total, 28156, "initial total complaints should match CSV row count");
  assert.equal(initial.summary.open, 2690, "initial open complaints should use In progress status");

  await page.locator("#status-filter").selectOption("Open");
  await page.waitForFunction(() => window.__dashboard?.filters.status === "Open");
  const openOnly = await page.evaluate(() => window.__dashboard);
  assert.equal(openOnly.rowCount, 2690, "status filter should show only open records");

  await page.locator("[data-testid='state-CA']").click();
  await page.waitForFunction(() => window.__dashboard?.filters.state === "CA");
  const california = await page.evaluate(() => window.__dashboard);
  assert.ok(california.rowCount > 0 && california.rowCount < openOnly.rowCount, "state hex should filter the dashboard");

  await page.locator("#search-box").fill("Equifax");
  await page.waitForFunction(() => window.__dashboard?.filters.search === "Equifax");
  const searched = await page.evaluate(() => window.__dashboard);
  assert.ok(searched.rowCount <= california.rowCount, "search should narrow the selected slice");

  await page.locator("#reset-btn").click();
  await page.waitForFunction(() => window.__dashboard?.filters.status === "all" && window.__dashboard?.rowCount === 28156);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#export-btn").click()
  ]);
  assert.equal(download.suggestedFilename(), "filtered-consumer-complaints.csv", "export should download a CSV");

  await mkdir(artifactDir, { recursive: true });
  await page.screenshot({ path: join(artifactDir, "dashboard-smoke.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 900 });
  await page.waitForTimeout(400);
  const mobileMetrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    bodyWidth: document.documentElement.scrollWidth
  }));
  assert.ok(
    mobileMetrics.bodyWidth <= mobileMetrics.viewport + 2,
    `mobile layout should not overflow horizontally: ${mobileMetrics.bodyWidth} > ${mobileMetrics.viewport}`
  );
  await page.screenshot({ path: join(artifactDir, "dashboard-mobile.png"), fullPage: true });

  console.log("PASS dashboard smoke test");
  console.log(`Checked URL: ${url}`);
  console.log("Screenshot: artifacts/dashboard-smoke.png");
  console.log("Mobile screenshot: artifacts/dashboard-mobile.png");
} finally {
  await browser.close();
  server.close();
}
