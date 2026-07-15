const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.FUGLE_API_KEY;

const SYMS = ["2327", "3037", "3706", "3006", "2313", "6147"];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// LINE Webhook：收到 LINE POST 請求時回傳 200
app.post("/webhook", (req, res) => {
  console.log("LINE webhook received");
  res.sendStatus(200);
});

async function quote(symbol) {
  if (!KEY) throw Error("尚未設定 FUGLE_API_KEY");

  const r = await fetch(
    `https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/${symbol}`,
    {
      headers: {
        "X-API-KEY": KEY
      }
    }
  );

  const j = await r.json();

  if (!r.ok) {
    throw Error(j.message || `Fugle HTTP ${r.status}`);
  }

  return {
    symbol,
    price: Number(
      j.lastPrice ??
      j.closePrice ??
      j.lastTrade?.price
    ),
    previousClose: Number(
      j.previousClose ??
      j.referencePrice ??
      0
    ),
    high: Number(j.highPrice ?? 0),
    low: Number(j.lowPrice ?? 0),
    volume: Number(
      j.total?.tradeVolume ??
      j.tradeVolume ??
      0
    ),
    lastSize: Number(j.lastTrade?.size ?? 0),
    timestamp: j.lastTrade?.time
      ? Date.parse(j.lastTrade.time)
      : Date.now()
  };
}

app.get("/api/quotes", async (req, res) => {
  try {
    const data = (
      await Promise.all(SYMS.map(quote))
    ).filter(x => isFinite(x.price));

    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Lisa V3 http://localhost:${PORT}`);
});
