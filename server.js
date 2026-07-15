const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.FUGLE_API_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 查詢 Fugle 股票即時報價
async function quote(symbol) {
  if (!KEY) {
    throw new Error("尚未設定 FUGLE_API_KEY");
  }

  const url =
    `https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/${symbol}`;

  const response = await fetch(url, {
    headers: {
      "X-API-KEY": KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Fugle API 錯誤：${response.status}`);
  }

  return await response.json();
}

// LINE Webhook
app.post("/webhook", async (req, res) => {
  // 先立即回覆 LINE 200，避免 webhook timeout
  res.sendStatus(200);

  try {
    console.log("LINE webhook received");

    const events = req.body.events || [];

    for (const event of events) {
      if (
        event.type !== "message" ||
        event.message?.type !== "text"
      ) {
        continue;
      }

      const text = event.message.text.trim();
      const replyToken = event.replyToken;

      // 只接受 4 位數股票代號
      if (!/^\d{4}$/.test(text)) {
        await replyLine(
          replyToken,
          "請輸入 4 位數台股代號，例如：2327"
        );
        continue;
      }

      try {
        const data = await quote(text);

        const price =
          data.lastPrice ??
          data.closePrice ??
          data.lastTrade?.price ??
          "無資料";

        const previousClose =
          data.previousClose ??
          data.referencePrice ??
          null;

        let changeText = "";

        if (
          typeof price === "number" &&
          typeof previousClose === "number"
        ) {
          const change = price - previousClose;
          const percent = (change / previousClose) * 100;

          changeText =
            `\n漲跌：${change >= 0 ? "+" : ""}${change.toFixed(2)}` +
            `（${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%）`;
        }

        const message =
          `📈 股票代號：${text}` +
          `\n目前價格：${price}` +
          changeText;

        await replyLine(replyToken, message);

      } catch (error) {
        console.error("股票查詢失敗：", error);

        await replyLine(
          replyToken,
          `查詢 ${text} 失敗：${error.message}`
        );
      }
    }

  } catch (error) {
    console.error("Webhook 處理失敗：", error);
  }
});

// 回覆 LINE 訊息
async function replyLine(replyToken, text) {
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!LINE_TOKEN) {
    throw new Error("尚未設定 LINE_CHANNEL_ACCESS_TOKEN");
  }

  const response = await fetch(
    "https://api.line.me/v2/bot/message/reply",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: [
          {
            type: "text",
            text: text
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LINE 回覆失敗 ${response.status}: ${errorText}`
    );
  }
}

// 首頁測試
app.get("/", (req, res) => {
  res.send("LINE Stock Bot is running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
