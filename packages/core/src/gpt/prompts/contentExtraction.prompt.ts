// cSpell:disable

import { Prompt } from "./prompt.types";

const extractMainContentAsHTML = (rawHTML: string): Prompt[] => [
  {
    id: "mainContent",
    model: "gpt-3.5-turbo-16k",
    role: "user",
    content: `
    GIVEN:
      - Raw HTML: '''${rawHTML}'''

    TASK:
      - Analyze the given raw HTML and identify the main content of the document.
      - The main content typically resides within tags such as <article>, <main>, <div id="content">, etc.
      - Extract this main content along with its surrounding HTML tags.
      - The goal is to preserve the structure of the main content as it is in the original document.
      - Return the extracted main content as a string of HTML.

    NOTE:
      - The output should be formatted as a string of HTML, not JSON.
      - If the main content cannot be identified, return an empty string.
`,
  },
];

export const contentPrompts = {
  extractMainContentAsHTML,
};
