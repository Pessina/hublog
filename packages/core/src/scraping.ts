import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
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
    throw new Error(`Error fetching content from ${url}: ${error}`);
  }
}
