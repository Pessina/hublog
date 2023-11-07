import axios from "axios";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { createForScrap } from "./events";
import sanitizeHtml from "sanitize-html";

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const { data: html } = await axios.get(url);
    const clean = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
      },
    });
    const { window } = parseHTML(clean);
    const reader = new Readability(window.document);
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
    // TODO: Save images on S3 and reference them
    html = html.replace(/<img[^>]*>/g, "");
    return html;
  } catch (error) {
    console.error(`Error cleaning HTML: ${error}`);
    throw error;
  }
}

export const createEventForScrap = async (html: string, jobId?: string) => {
  await createForScrap(html, jobId);
};
