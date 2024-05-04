// const express = require("express");
// const puppeteer = require("puppeteer");
// const cheerio = require("cheerio");
// const cors = require("cors");
// require("dotenv").config();

// const app = express();
// app.use(cors());

// const CHROMIUM_PATH =
//   "https://vomrghiulbmrfvmhlflk.supabase.co/storage/v1/object/public/chromium-pack/chromium-v123.0.0-pack.tar";
// async function getBrowser() {
//   if (process.env.NODE_ENV === "production") {
//     const chromium = require("@sparticuz/chromium-min");
//     const puppeteerCore = require("puppeteer-core");

//     const executablePath = await chromium.executablePath(CHROMIUM_PATH);

//     const browser = await puppeteerCore.launch({
//       args: chromium.args,
//       defaultViewport: chromium.defaultViewport,
//       executablePath,
//       headless: chromium.headless,
//     });
//     return browser;
//   } else {
//     const browser = await puppeteer.launch();
//     return browser;
//   }
// }

// app.get("/data", async (req, res) => {
//   try {
//     const today = new Date().toISOString().split("T")[0];
//     const dateFilter = req.query.date || today;

//     const browsers = await getBrowser();
//     // puppeteer.launch({
//     //   headless: "new", // Opt in to the new headless mode
//     //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     //   executablePath: await chromium.executablePath(), // If you are using a specific version of Chromium
//     // });

//     const page = await browsers.newPage();
//     // Set user agent
//     await page.setUserAgent(
//       "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
//     );
//     // Set user agent if necessary

//     await page.goto(
//       "https://www.nbc.gov.kh/english/economic_research/exchange_rate.php"
//     );
//     await page.waitForTimeout(5000);

//     await page.$eval(
//       "#datepicker",
//       (datepicker, dateFilter) => {
//         datepicker.value = dateFilter;
//       },
//       dateFilter
//     );
//     await page.click('input[name="view"]');
//     await page.waitForTimeout(5000);

//     const content = await page.content();
//     const $ = cheerio.load(content);

//     const exchangeRates = [];
//     $("table.tbl-responsive tr").each((index, element) => {
//       if (index > 0) {
//         const columns = $(element).find("td");
//         const currency = columns.eq(0).text().trim();
//         const Symbol = columns.eq(1).text().trim();
//         const unit = columns.eq(2).text().trim();
//         const bid = columns.eq(3).text().trim();
//         const ask = columns.eq(4).text().trim();

//         exchangeRates.push({ currency, Symbol, unit, bid, ask });
//       }
//     });

//     const officialExchangeRateRow = $('td:contains("Official Exchange Rate")');
//     const officialExchangeRateText = officialExchangeRateRow.text();
//     const officialExchangeRateMatch = officialExchangeRateText.match(/(\d+)/);
//     const officialExchangeRate = officialExchangeRateMatch
//       ? parseInt(officialExchangeRateMatch[1])
//       : null;

//     await browsers.close();

//     const response = {
//       ok: true,
//       value: exchangeRates,
//       officialExchangeRate,
//       date: dateFilter,
//     };

//     res.json(response);
//   } catch (error) {
//     console.error("Error:", error);

//     if (error instanceof puppeteer.errors.TimeoutError) {
//       res.status(500).json({ error: "Timeout Error" });
//     } else if (error.message === "Navigating frame was detached") {
//       res.status(500).json({ error: "Frame detached error" });
//     } else {
//       res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });

const express = require("express");
const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());

const CHROMIUM_PATH =
  "https://vomrghiulbmrfvmhlflk.supabase.co/storage/v1/object/public/chromium-pack/chromium-v123.0.0-pack.tar";

async function getBrowser() {
  if (process.env.NODE_ENV === "production") {
    const chromium = require("@sparticuz/chromium-min");
    const puppeteerCore = require("puppeteer-core");

    const executablePath = await chromium.executablePath(CHROMIUM_PATH);

    const browser = await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });
    return browser;
  } else {
    const browser = await puppeteer.launch();
    return browser;
  }
}

app.get("/data", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const dateFilter = req.query.date || today;

    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
    );

    await page.goto(
      "https://www.nbc.gov.kh/english/economic_research/exchange_rate.php",
      { waitUntil: "domcontentloaded", timeout: 6000 } // Increase timeout if needed
    );

    await page.waitForSelector("#datepicker");
    await page.$eval(
      "#datepicker",
      (datepicker, dateFilter) => {
        datepicker.value = dateFilter;
      },
      dateFilter
    );
    await page.click('input[name="view"]');
    await page.waitForSelector("table.tbl-responsive");

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
