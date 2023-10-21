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

    Summarize the content of the article
`,
  },
];

export const contentPrompts = {
  extractMainContentAsHTML,
};
