const express = require("express");
const router = express.Router();

const {
  getQuoteBySymbol,
  getQuotes,
  clearCache,
  getCacheStatus
} = require("../services/quoteService");

/**
 * GET /api/quote/:symbol
 */
router.get("/quote/:symbol", async (req, res) => {
  try {
    const data = await getQuoteBySymbol(req.params.symbol);

    res.json({
      success: true,
      data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/quotes?symbols=2327,3037,3706
 */
router.get("/quotes", async (req, res) => {

  try {

    let symbols =
      req.query.symbols
        ?.split(",")
        .map(s => s.trim())
        .filter(Boolean);

    if (!symbols || symbols.length === 0) {
      symbols = [
        "2327",
        "3037",
        "3706",
        "3006",
        "2313",
        "6147"
      ];
    }

    const data = await getQuotes(symbols);

    res.json({
      success: true,
      count: data.length,
      data
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      error: err.message
    });

  }

});

/**
 * GET /api/cache
 */
router.get("/cache", (req, res) => {

  res.json({
    success: true,
    cache: getCacheStatus()
  });

});

/**
 * DELETE /api/cache
 */
router.delete("/cache", (req, res) => {

  clearCache();

  res.json({
    success: true,
    message: "Cache cleared"
  });

});

module.exports = router;
