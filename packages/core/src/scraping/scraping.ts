import axios from "axios";
import { HTMLImageElement, parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { createForScrap } from "./events";
import sanitizeHtml from "sanitize-html";
import crypto from "crypto";

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

function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}

export async function replaceImagesWithPlaceholders(html: string): Promise<{
  noImagesHTML: string;
  images: Array<{ urlHash: string; imgSrc: string }>;
}> {
  const dom = parseHTML(html);
  let images: Array<{ urlHash: string; imgSrc: string }> = [];

  dom.window.document
    .querySelectorAll("img")
    .forEach((img: HTMLImageElement) => {
      const src = img.getAttribute("src");
      if (!src) return;
      const urlHash = hashUrl(src);
      images.push({ urlHash, imgSrc: src });
      img.setAttribute("src", urlHash);
    });

  return { noImagesHTML: dom.serialize(), images };
}

export function cleanHTML(html: string): string {
  try {
    html = html.replace(/<a[^>]*>([^<]+)<\/a>/g, "$1");
    html = html.replace(/\s\s+/g, " ").trim();
    return html;
  } catch (error) {
    console.error(`Error cleaning HTML: ${error}`);
    throw error;
  }
}

export const createEventForScrap = async (html: string, jobId?: string) => {
  await createForScrap(html, jobId);
};
