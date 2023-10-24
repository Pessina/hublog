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

async function getRobotsTxt(domain: string): Promise<string> {
  try {
    const { data: robotsTxt } = await axios.get(`https://${domain}/robots.txt`);
    return robotsTxt;
  } catch (error) {
    console.error(`Error fetching robots.txt: ${error}`);
    throw error;
  }
}

async function getSitemap(domain: string): Promise<string[]> {
  const urls: string[] = [];
  const stack: string[] = [`https://${domain}/sitemap.xml`];
  const sitemapRegex = /https?:\/\/.*\/.*sitemap.*\.xml$/i;

  while (stack.length > 0) {
    const currentUrl = stack.pop()!;
    try {
      const { data: sitemapXml } = await axios.get(currentUrl);
      const parser = new xml2js.Parser();
      const sitemap = await parser.parseStringPromise(sitemapXml);
      let urlList: string[] = [];
      if (sitemap.urlset) {
        urlList = sitemap.urlset.url.map((u: any) => u.loc[0]);
      } else if (sitemap.sitemapindex) {
        urlList = sitemap.sitemapindex.sitemap.map((u: any) => u.loc[0]);
      }

      for (const url of urlList) {
        if (sitemapRegex.test(url)) {
          stack.push(url);
        } else {
          urls.push(url);
        }
      }
    } catch (error) {
      console.error(`Error fetching sitemap: ${error}`);
      throw error;
    }
  }
  return urls;
}

export async function checkRobotsAndSitemap(domain: string): Promise<string[]> {
  const robotsTxt = await getRobotsTxt(domain);
  const isAllowed = !robotsTxt.includes(`User-agent: *\nDisallow: /`);
  if (isAllowed) {
    const sitemap = await getSitemap(domain);
    return sitemap;
  } else {
    throw new Error(`User-agent * is disallowed from ${domain}`);
  }
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
    html = html.replace(/\s\s+/g, " ").trim();
    return html;
  } catch (error) {
    console.error(`Error cleaning HTML: ${error}`);
    throw error;
  }
}
