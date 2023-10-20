// @ts-nocheck
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const CHROMIUM_PATH =
  "/tmp/localChromium/chromium/mac_arm-1212771/chrome-mac/Chromium.app/Contents/MacOS/Chromium";

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: process.env.IS_LOCAL
        ? CHROMIUM_PATH
        : await chromium.executablePath(),
      headless: chromium.headless,
    });

    let page = await browser.newPage();
    await page.goto(url);

    // Inject Readability script into the page
    await page.addScriptTag({
      url: "https://cdn.jsdelivr.net/npm/moz-readability@0.2.1/Readability.min.js",
    });

    const content = await page.evaluate(() => {
      const documentClone = document.cloneNode(true) as Document;
      const reader = new Readability(documentClone);
      const article = reader.parse();
      return article ? article.content : null;
    });

    if (content) {
      return content;
    } else {
      throw new Error(`Could not fetch main content from ${url}`);
    }
  } catch (error) {
    throw new Error(`Error fetching content from ${url}: ${error}`);
  }
}
