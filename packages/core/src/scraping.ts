import axios from "axios";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";

export async function fetchPageContent(url: string): Promise<string> {
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
}
