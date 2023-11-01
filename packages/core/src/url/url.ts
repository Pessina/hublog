import xml2js from "xml2js";
import axios from "axios";
import * as UrlEvents from "./events";

const SITEMAP_REGEX = /https?:\/\/.*\/.*sitemap.*\.xml$/i;

async function fetchSitemapUrls(url: string): Promise<string[]> {
  try {
    const parser = new xml2js.Parser();
    const { data: sitemapXml } = await axios.get(url);
    const sitemap = await parser.parseStringPromise(sitemapXml);
    return (
      sitemap.urlset?.url.map((u: { loc: string[] }) => u.loc[0]) ||
      sitemap.sitemapindex?.sitemap.map((u: { loc: string[] }) => u.loc[0]) ||
      []
    );
  } catch (error) {
    console.error(`Error fetching sitemap from ${url}: ${error}`);
    throw error;
  }
}

export async function getSitemapUrlsFromDomain(url: string): Promise<string[]> {
  const domain = new URL(url).hostname;
  const urls: string[] = [];
  const stack: string[] = [
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/sitemap.xml`,
  ];

  while (stack.length > 0) {
    const currentUrl = stack.pop()!;
    try {
      const urlList = await fetchSitemapUrls(currentUrl);
      urlList.forEach((url: string) =>
        SITEMAP_REGEX.test(url) ? stack.push(url) : urls.push(url)
      );
    } catch (error) {
      console.error(`Error fetching sitemap from ${currentUrl}: ${error}`);
    }
  }
  return urls;
}

export async function createEventsForUrls(urls: string[]) {
  for (const url of urls) {
    try {
      new URL(url);

      await UrlEvents.createForUrl(url);
    } catch (error) {
      console.error(`Error creating event for ${url}: ${error}`);
    }
  }
}

export async function createEventForSitemap(url: string) {
  try {
    new URL(url);
    await UrlEvents.createForSitemap(url);
  } catch (error) {
    console.error(`Error creating event for sitemap ${url}: ${error}`);
  }
}
