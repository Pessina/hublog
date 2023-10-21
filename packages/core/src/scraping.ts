import axios from "axios";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

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
