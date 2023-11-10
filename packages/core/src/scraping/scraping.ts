import axios from "axios";
import { HTMLImageElement, parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import sanitizeHtml from "sanitize-html";
import { retrieveImage } from "../s3/ImagesBucket";
import { hashUrl } from "../utils/utils";

type PageContent = {
  title: string;
  metaDescription: string;
  content: string;
};

export async function fetchPageContent(url: string): Promise<PageContent> {
  try {
    const { data: html } = await axios.get(url);

    const { document: doc } = parseHTML(html);

    const title = doc.querySelector("title")?.textContent || "";
    const metaDescription =
      doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
      "";

    const cleanHtml = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "alt"],
      },
    });

    const { document } = parseHTML(cleanHtml);

    const reader = new Readability(document);
    const article = reader.parse();

    if (article && article.content) {
      return {
        title,
        metaDescription,
        content: article.content,
      };
    } else {
      throw new Error(`Could not fetch main content from ${url}`);
    }
  } catch (error) {
    throw new Error(`Error fetching page content: ${error}`);
  }
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

  return { noImagesHTML: dom.document.toString(), images };
}

export async function addBackImageUrls(html: string): Promise<string> {
  const dom = parseHTML(html);
  const images = dom.window.document.querySelectorAll("img");

  for (const img of images) {
    const urlHash = img.getAttribute("src");
    if (urlHash) {
      const imageUrl = await retrieveImage(urlHash);
      img.setAttribute("src", imageUrl);
    }
  }

  return dom.document.toString();
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
