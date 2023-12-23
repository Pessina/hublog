import axios from "axios";
import { HTMLImageElement, parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import sanitizeHtml from "sanitize-html";
import { hashUrl } from "../../utils/utils";
import { retrieveImageURL } from "../s3/ImagesBucket";

export const processURLContent = async (url: string) => {
  try {
    const html = await fetchPage(url);
    return getHTMLContent(html);
  } catch (error) {
    throw new Error(`Error fetching page content: ${error}`);
  }
};

export const fetchPage = async (url: string) => {
  return (await axios.get(url)).data;
};

export async function getHTMLContent(html: string): Promise<string> {
  const secureHTMl = sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "body",
      "header",
    ]),
    allowedAttributes: {
      img: ["src", "alt", "title", "loading"],
    },
  });

  const { document } = parseHTML(secureHTMl);

  const reader = new Readability(document);
  const article = reader.parse();

  if (article && article.content) {
    if (countWordsInString(article.textContent) < 500) {
      throw new Error("Article is too short");
    }

    return article.content.replace(/\s\s+/g, " ").trim();
  } else {
    throw new Error("Could not parse HTML");
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
      const imageUrl = await retrieveImageURL(urlHash);
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
    .replace(/\t|\n/g, "")
    .replace(/^["'`]+|["'`]+$/g, "");
}

export const countWordsInString = (input: string): number => {
  return input.split(/\s+/).length;
};

export const removeAllTags = (html: string) => {
  return sanitizeHtml(html, {
    allowedTags: [],
  });
};
