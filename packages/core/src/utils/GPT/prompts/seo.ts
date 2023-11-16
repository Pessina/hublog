// cSpell:disable

import { GPTPrompt } from "../schemas/types";

const seo = (rawHTML: string, targetLanguage: string): GPTPrompt => ({
  model: "gpt-3.5-turbo-1106",
  messages: [
    {
      role: "user",
      content: `
    - HTML: '''${rawHTML}'''
    - Target Language: '''${targetLanguage}'''

    Improve the SEO of the following post

    NOTE: 
      - Your answer should be the HTML content. Nothing else
`,
    },
  ],
});

export const contentPrompts = {
  seo,
};
