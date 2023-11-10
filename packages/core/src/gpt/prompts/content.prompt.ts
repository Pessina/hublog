// cSpell:disable

import { Prompt } from "./prompt.types";

const translation = (rawHTML: string, targetLanguage: string): Prompt[] => [
  {
    id: "translation",
    model: "gpt-3.5-turbo-1106",
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

const clean = (rawHTML: string): Prompt[] => [
  {
    id: "clean",
    model: "gpt-3.5-turbo-1106",
    role: "user",
    content: `
    - HTML: '''${rawHTML}'''

    Make sure the HTML content is clean and ready to be published and remove sections that recommend other posts

    NOTE: 
      - Your answer should be the HTML content. Nothing else
`,
  },
];

export const contentPrompts = {
  translation,
  clean,
};
