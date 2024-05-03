const express = require("express");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const cors = require("cors");
require("dotenv").config();
const app = express();
app.use(cors());

app.get("/data", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const dateFilter = req.query.date || today;

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPEPTEER_EXECUTTABLE_PATH
          : puppeteer.executablePath(),
    });

    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
    );

    // Increase the navigation timeout to 60 seconds (60000 milliseconds)
    await page.goto(
      "https://www.nbc.gov.kh/english/economic_research/exchange_rate.php"
    );

    await page.waitForTimeout(2000);

    await page.$eval(
      "#datepicker",
      (datepicker, dateFilter) => {
        datepicker.value = dateFilter;
      },
      dateFilter
    );

    await page.click('input[name="view"]');
    await page.waitForTimeout(2000);

    const content = await page.content();
    const $ = cheerio.load(content);

    const exchangeRates = [];

    $("table.tbl-responsive tr").each((index, element) => {
      if (index > 0) {
        const columns = $(element).find("td");
        const currency = columns.eq(0).text().trim();
        const Symbol = columns.eq(1).text().trim();
        const unit = columns.eq(2).text().trim();
        const bid = columns.eq(3).text().trim();
        const ask = columns.eq(4).text().trim();

        exchangeRates.push({ currency, Symbol, unit, bid, ask });
      }
    });

    const officialExchangeRateRow = $('td:contains("Official Exchange Rate")');
    const officialExchangeRateText = officialExchangeRateRow.text();
    const officialExchangeRateMatch = officialExchangeRateText.match(/(\d+)/);
    const officialExchangeRate = officialExchangeRateMatch
      ? parseInt(officialExchangeRateMatch[1])
      : null;

    await browser.close();

    const response = {
      ok: true,
      value: exchangeRates,
      officialExchangeRate,
      date: dateFilter,
    };

    res.json(response);
  } catch (error) {
    console.error("Error:", error);

    if (error instanceof puppeteer.errors.TimeoutError) {
      res.status(500).json({ error: "Timeout Error" });
    } else if (error.message === "Navigating frame was detached") {
      // Handle detached frame error
      res.status(500).json({ error: "Frame detached error" });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
