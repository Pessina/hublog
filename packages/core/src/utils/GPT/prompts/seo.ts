// cSpell:disable

import { Prompt } from "./prompt.types";

const seo = (rawHTML: string, targetLanguage: string): Prompt[] => [
  {
    id: "seo",
    model: "gpt-3.5-turbo-1106",
    role: "user",
    content: `
    - HTML: '''${rawHTML}'''
    - Target Language: '''${targetLanguage}'''

    Improve the SEO of the following post

    NOTE: 
      - Your answer should be the HTML content. Nothing else
`,
  },
];

export const contentPrompts = {
  seo,
};
