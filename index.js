// index.js

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
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Puppeteer proxy server running on http://localhost:${PORT}`);
});

/* package.json */
/*
{
  "name": "coinmarketcap-proxy",
  "version": "1.0.0",
  "description": "Proxy server using Puppeteer to scrape token prices from CoinMarketCap DEX.",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "author": "",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "puppeteer": "^21.3.8"
  }
}
*/
