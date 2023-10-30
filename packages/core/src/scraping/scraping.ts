import axios from "axios";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { event } from "../events/events";
import { z } from "zod";
import crypto from "crypto";
import xml2js from "xml2js";

export const Events = {
  Created: event("scrap.created", {
    id: z.string(),
    scrap: z.string(),
  }),
};

export async function create(scrap: string) {
  const id = crypto.randomUUID();

  await Events.Created.publish({
    id,
    scrap,
  });
}

async function getSitemap(domain: string): Promise<string[]> {
  const urls: string[] = [];
  const sitemapUrls = [
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/sitemap.xml`,
  ];
  const sitemapRegex = /https?:\/\/.*\/.*sitemap.*\.xml$/i;
  const parser = new xml2js.Parser();
  const stack: string[] = [];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const { data: sitemapXml } = await axios.get(sitemapUrl);
      const sitemap = await parser.parseStringPromise(sitemapXml);
      const urlList: string[] =
        sitemap.urlset?.url.map((u: { loc: string[] }) => u.loc[0]) ||
        sitemap.sitemapindex?.sitemap.map((u: { loc: string[] }) => u.loc[0]) ||
        [];

      urlList.forEach((url: string) =>
        sitemapRegex.test(url) ? stack.push(url) : urls.push(url)
      );
      break;
    } catch (error) {
      console.error(`Error fetching sitemap from ${sitemapUrl}: ${error}`);
    }
  }

  while (stack.length > 0) {
    const currentUrl = stack.pop()!;
    try {
      const { data: sitemapXml } = await axios.get(currentUrl);
      const sitemap = await parser.parseStringPromise(sitemapXml);
      const urlList: string[] =
        sitemap.urlset?.url.map((u: { loc: string[] }) => u.loc[0]) ||
        sitemap.sitemapindex?.sitemap.map((u: { loc: string[] }) => u.loc[0]) ||
        [];

      urlList.forEach((url: string) =>
        sitemapRegex.test(url) ? stack.push(url) : urls.push(url)
      );
    } catch (error) {
      console.error(`Error fetching sitemap: ${error}`);
    }
  }
  return urls;
}

export async function checkRobotsAndSitemap(domain: string): Promise<string[]> {
  return await getSitemap(domain);
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const { data: html } = await axios.get(url);
    const { window } = parseHTML(html);
    const document = window.document;
    // TODO: Sanitize HTML for security reasons before passing to Readability
    const reader = new Readability(document);
    const article = reader.parse();

    if (article && article.content) {
      return article.content;
    } else {
      throw new Error(`Could not fetch main content from ${url}`);
    }
  } catch (error) {
    console.error(`Error fetching page content: ${error}`);
    throw error;
  }
}

export function cleanHTML(html: string): string {
  try {
    html = html.replace(/<a[^>]*>([^<]+)<\/a>/g, "$1");
    html = html.replace(/<img[^>]*>/g, "");
    html = html.replace(/<svg[^>]*>.*?<\/svg>/gs, "");
    html = html.replace(/\s\s+/g, " ").trim();
    return html;
  } catch (error) {
    console.error(`Error cleaning HTML: ${error}`);
    throw error;
  }
}
