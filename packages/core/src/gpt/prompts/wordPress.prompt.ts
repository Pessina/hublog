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
     
      1. Suggest a title for the post, following SEO best practices:
        - Reflects the post content
        - Include the target keyword
        - Aim for a title length of about 55 characters
        - Keep the word count around 7 words
        - Incorporate emotional words to trigger engagement
        - Add at least one power word for more impact
        - Ensure the title has a positive sentiment for better engagement

      2. Suggest a metaDescription for the post, following SEO best practices: 
        - Reflects the post content
        - Keep it concise, around 150 characters
        - Include the target keyword
        
      3. Suggest a Slug for the post, following SEO best practices:
        - Include the target keyword
        - Keep it concise
        - Reflects the post content

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
