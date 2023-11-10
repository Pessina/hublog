import axios from "axios";
import { HTMLImageElement, parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import sanitizeHtml from "sanitize-html";
import { retrieveImage } from "../s3/ImagesBucket";
import { hashUrl } from "../utils/utils";
import { ContentAIUtils } from "../contentAI";
import { SES } from "../email";

type PageContent = {
  title: string;
  metaDescription: string;
  content: string;
};

export async function fetchPageContent(url: string): Promise<PageContent> {
  try {
    const { data: html } = await axios.get(url);

    const secureHTMl = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags
        .concat(["img", "title", "meta"])
        .filter((t) => t !== "a" && t !== "span"),
      allowedAttributes: {
        img: ["src", "alt"],
        meta: ["name", "content"],
      },
      exclusiveFilter: function (frame) {
        return frame.tag === "meta" && frame.attribs.name !== "description";
      },
    });

    const { document } = parseHTML(secureHTMl);

    const title = document.querySelector("title")?.textContent || "";
    const metaDescription =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") || "";

    const reader = new Readability(document);
    const article = reader.parse();

    if (article && article.content) {
      const strippedHTML = article.content.replace(/\s\s+/g, " ").trim();

      return {
        title,
        metaDescription,
        content: strippedHTML,
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

export function breakHTMLByHeaders(html: string): string[] {
  const headers = ["<h1>", "<h2>", "<h3>", "<h4>", "<h5>", "<h6>"];
  let result = [];
  let lastCut = 0;

  for (let i = 0; i < html.length; i++) {
    if (headers.includes(html.slice(i, i + 4)) && i !== 0) {
      result.push(html.slice(lastCut, i));
      lastCut = i;
    }
  }

  result.push(html.slice(lastCut, html.length));

  return result;
}

export function trimAndRemoveQuotes(input: string): string {
  return input
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\t|\n/g, "");
}
