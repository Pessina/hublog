import axios from "axios";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { createForScrap } from "./events";

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

export const createEventForScrap = async (html: string, jobId?: string) => {
  await createForScrap(html, jobId);
};
