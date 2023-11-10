import { Prompt } from "./prompt.types";

const getWordPressArgs = (
  rawHTML: string,
  targetLanguage: string
): Prompt[] => [
  {
    id: "wordPressArgs",
    model: "gpt-3.5-turbo-1106",
    role: "user",
    content: `
      Given the HTML content of a WordPress Travel Blog post:
      - HTML: '''${rawHTML}'''
      - Target language: '''${targetLanguage}'''

      Perform the following tasks for the target language:
     
      1. Suggest a title for the post, following SEO best practices such as using keywords, keeping it concise, and ensuring it reflects the post content.
      2. Suggest a metaDescription for the post, following SEO best practices such as using keywords, keeping it concise, and ensuring it reflects the post content.
      3. Suggest a Slug for the post, following SEO best practices such as using keywords, keeping it concise, and ensuring it reflects the post content.

      Organize the suggestions in the following JSON structure:

      {
        "title": "string"
        "metaDescription": "string"
        "slug": "string"
      }
    `,
    schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
        },
        metaDescription: {
          type: "string",
        },
        slug: {
          type: "string",
        },
      },
    },
  },
];

export const wordPressPrompts = {
  getWordPressArgs,
};
