// cSpell:disable

import { Prompt } from "./prompt.types";

const extractMainContentAsHTML = (
  rawHTML: string,
  targetLanguage: string
): Prompt[] => [
  {
    id: "mainContent",
    model: "gpt-3.5-turbo-16k",
    role: "user",
    content: `
    - HTML: '''${rawHTML}'''
    - Target Language: '''${targetLanguage}'''

    Translate the HTML content within to the target language. 

    NOTE: 
      - Your answer should be the translated HTML content. Nothing else
`,
  },
];

export const contentPrompts = {
  extractMainContentAsHTML,
};
