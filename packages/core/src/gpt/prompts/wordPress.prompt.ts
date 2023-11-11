import { Prompt } from "./prompt.types";

const getWordPressSEOArgs = (
  rawHTML: string,
  targetLanguage: string
): Prompt[] => [
  {
    id: "wordPressArgs",
    model: "gpt-3.5-turbo-16k",
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

      NOTE: 
        - The title, metaDescription and slug should be in the target language

      Organize the suggestions in the following JSON structure:

      {{
        "title": "string"
        "metaDescription": "string"
        "slug": "string"
      }}
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

const getWordPressFeaturedImage = (rawHTML: string): Prompt[] => [
  {
    id: "wordPressArgs",
    model: "gpt-3.5-turbo-16k",
    role: "user",
    content: `
      Given the HTML content of a WordPress Travel Blog post:
      - HTML: '''${rawHTML}'''
    
      1. Choose the image that most suits as featured image for WordPress

      Organize the choice in the following JSON structure, where src is the <img> src attribute:

      {{
        "src": "string"
      }}
    `,
    schema: {
      type: "object",
      properties: {
        src: {
          type: "string",
        },
      },
    },
  },
];

export const wordPressPrompts = {
  getWordPressSEOArgs,
  getWordPressClassificationArgs,
  getWordPressFeaturedImage,
};
