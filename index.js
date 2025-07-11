// puppeteer-proxy-server.js

const express = require("express");
const puppeteer = require("puppeteer");
const app = express();

// Optional: in-memory cache to reduce load
const cache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

app.get("/price/:chain/:token", async (req, res) => {
  const { chain, token } = req.params;
  const cacheKey = `${chain}:${token}`;
  const now = Date.now();

  // Serve from cache if available and fresh
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      return res.json({ price: cached.price, cached: true });
    }
  }

  const url = `https://dex.coinmarketcap.com/token/${chain}/${token}/`;

  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // 👇 Adjust this selector based on actual DOM structure of the DEX page
    const price = await page.$eval("[data-qa-id='dex-price']", el => el.textContent.trim());

    await browser.close();

    // Save to cache
    cache.set(cacheKey, { price, timestamp: now });

    res.json({ price, cached: false });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch price", details: e.message });
  }
});

app.listen(3000, () => {
  console.log("✅ Puppeteer proxy server is running on http://localhost:3000");
});
