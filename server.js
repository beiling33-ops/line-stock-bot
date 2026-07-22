const BASE_URL = "https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote";

const API_KEY = process.env.FUGLE_API_KEY;

if (!API_KEY) {
  console.warn("[Fugle] FUGLE_API_KEY 未設定");
}

const DEFAULT_TIMEOUT = 5000;
const DEFAULT_RETRY = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(symbol, retry = DEFAULT_RETRY) {
  let lastError;

  for (let i = 1; i <= retry; i++) {
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, DEFAULT_TIMEOUT);

    try {
      const response = await fetch(
        `${BASE_URL}/${symbol}`,
        {
          method: "GET",
          headers: {
            "X-API-KEY": API_KEY
          },
          signal: controller.signal
        }
      );

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();

    } catch (err) {
      clearTimeout(timer);

      lastError = err;

      if (i < retry) {
        await sleep(500);
      }
    }
  }

  throw lastError;
}

function normalize(symbol, data) {

  const price =
    Number(
      data.lastPrice ??
      data.closePrice ??
      data.lastTrade?.price ??
      0
    );

  const previousClose =
    Number(
      data.previousClose ??
      data.referencePrice ??
      0
    );

  const change = price - previousClose;

  return {

    symbol,

    price,

    previousClose,

    change,

    changePercent:
      previousClose
        ? Number(
            (
              change /
              previousClose *
              100
            ).toFixed(2)
          )
        : 0,

    high:
      Number(
        data.highPrice ??
        0
      ),

    low:
      Number(
        data.lowPrice ??
        0
      ),

    open:
      Number(
        data.openPrice ??
        0
      ),

    volume:
      Number(
        data.total?.tradeVolume ??
        data.tradeVolume ??
        0
      ),

    lastSize:
      Number(
        data.lastTrade?.size ??
        0
      ),

    timestamp:
      data.lastTrade?.time ??
      new Date().toISOString()
  };
}

async function getQuote(symbol) {

  if (!/^\d{4}$/.test(symbol)) {
    throw new Error("股票代號格式錯誤");
  }

  const raw = await request(symbol);

  return normalize(symbol, raw);
}

module.exports = {

  getQuote

};
