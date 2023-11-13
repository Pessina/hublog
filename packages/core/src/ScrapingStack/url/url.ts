import xml2js from "xml2js";
import axios from "axios";
import { Events } from "./events";
import { DestinationBlog } from "../api/validation";
import { TranslationJobsQueue } from "../queue";

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

/**
 * This function creates events for each URL in the provided list.
 * It iterates over the URLs and the destination blogs, emitting an event for each combination.
 * Note: The events are not processed in parallel due to potential issues that could arise from concurrent processing.
 *
 * @param {string[]} urls - The list of URLs for which to create events.
 * @param {DestinationBlog[]} destinationBlogs - The list of destination blogs for which to create events.
 */

export async function createEventsForUrls(
  urls: string[],
  destinationBlogs: DestinationBlog[]
) {
  for (const url of urls) {
    try {
      for (const d of destinationBlogs) {
        await TranslationJobsQueue.emitMessage({
          ...d,
          originURL: url,
        });
      }

      await Events.CreatedForUrl.publish({ url });
    } catch (error) {
      console.error(`Error creating event for ${url}: ${error}`);
    }
  }
}
