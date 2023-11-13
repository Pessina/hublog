import { Prompt } from "./prompt.types";

const getWordPressClassificationArgs = (
  rawHTML: string,
  tags: string[],
  categories: string[]
): Prompt[] => [
  {
    id: "wordPressArgs",
    model: "gpt-3.5-turbo-16k",
    role: "user",
    content: `
      Given the HTML content of a WordPress Travel Blog post:
      - HTML: '''${rawHTML}'''
      - Tags: '''${tags.join(", ")}'''
      - Categories: '''${categories.join(", ")}'''
      
      1. Analyze the HTML content and choose the 5 most relevant tags for the post from the provided Tags list
      2. Analyze the HTML content and choose the 2 most relevant categories for the post from the provided Categories list

      Organize the choices in the following JSON structure:

      {{
        "categories": "string[]"
        "tags": "string[]"
      }}
    `,
    schema: {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: {
            category: "string",
          },
        },
        tags: {
          type: "array",
          items: {
            tag: "string",
          },
        },
      },
    },
  },
];

export const wordPressPrompts = {
  getWordPressClassificationArgs,
};
