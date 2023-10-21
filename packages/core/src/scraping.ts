import axios from "axios";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { Node } from "linkedom/types/interface/node";

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
    html = html.replace(/\s\s+/g, " ").trim();
    return html;
  } catch (error) {
    console.error(`Error cleaning HTML: ${error}`);
    throw error;
  }
}

// interface TextNode {
//   text: string;
//   tag: string;
//   placeholder: string;
// }

// export function extractTextWithTags(html: string): {
//   textNodes: TextNode[];
//   placeholderString: string;
// } {
//   const { window } = parseHTML(html);
//   const document = window.document;
//   const body = document.body;
//   const textNodes: TextNode[] = [];
//   let placeholderString = "";

//   function walk(node: Node, index: number): void {
//     if (node.nodeName === "#text") {
//       const placeholder = `{{${index}}}`;
//       textNodes.push({
//         text: node.textContent,
//         tag: node.parentNode.nodeName,
//         placeholder,
//       });
//       placeholderString += ` ${placeholder} `;
//     } else {
//       let child = node.firstChild;
//       while (child) {
//         walk(child, textNodes.length);
//         child = child.nextSibling;
//       }
//     }
//   }

//   walk(body, 0);
//   return { textNodes, placeholderString };
// }

// export async function translatePlaceholderString(
//   placeholderString: string,
//   targetLanguage: string,
//   translator: (original: string, targetLanguage: string) => string
// ): Promise<string> {
//   const translated = await translator(placeholderString, targetLanguage);
//   return translated;
// }

// export function reconstructHTMLFromTranslatedPlaceholderString(
//   translatedPlaceholderString: string,
//   textNodes: TextNode[]
// ): string {
//   let html = translatedPlaceholderString;

//   for (let textObj of textNodes) {
//     html = html.replace(
//       textObj.placeholder,
//       `<${textObj.tag}>${textObj.text}</${textObj.tag}>`
//     );
//   }

//   return html;
// }

// export async function translateHTML(
//   html: string,
//   targetLanguage: string,
//   translator: (original: string, targetLanguage: string) => string
// ): Promise<string> {
//   const { textNodes, placeholderString } = extractTextWithTags(html);
//   const translatedPlaceholderString = await translatePlaceholderString(
//     placeholderString,
//     targetLanguage,
//     translator
//   );
//   const translatedHTML = reconstructHTMLFromTranslatedPlaceholderString(
//     translatedPlaceholderString,
//     textNodes
//   );
//   return translatedHTML;
// }
