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
    language: z.string(),
  }),
};

export async function create(scrap: string, language: string) {
  const id = crypto.randomUUID();

  await Events.Created.publish({
    id,
    scrap,
    language,
  });
}

async function fetchSitemap(url: string): Promise<string[]> {
  const parser = new xml2js.Parser();
  const { data: sitemapXml } = await axios.get(url);
  const sitemap = await parser.parseStringPromise(sitemapXml);
  return (
    sitemap.urlset?.url.map((u: { loc: string[] }) => u.loc[0]) ||
    sitemap.sitemapindex?.sitemap.map((u: { loc: string[] }) => u.loc[0]) ||
    []
  );
}

async function getSitemap(domain: string): Promise<string[]> {
  const urls: string[] = [];
  const stack: string[] = [];
  const sitemapUrls = [
    `https://${domain}/sitemap_index.xml`,
    `https://${domain}/sitemap.xml`,
  ];
  const sitemapRegex = /https?:\/\/.*\/.*sitemap.*\.xml$/i;

  for (const sitemapUrl of sitemapUrls) {
    try {
      const urlList = await fetchSitemap(sitemapUrl);
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
      const urlList = await fetchSitemap(currentUrl);
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
    html = html.replace(/<svg[^>]*>.*?<\/svg>/gs, "");
    html = html.replace(/\s\s+/g, " ").trim();
    // TODO: Handle images properly instead of clean them
    html = html.replace(/<img[^>]*>/g, "");
    return html;
  } catch (error) {
    console.error(`Error cleaning HTML: ${error}`);
    throw error;
  }
}
