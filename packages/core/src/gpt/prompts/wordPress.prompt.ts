import { Prompt } from "./prompt.types";

const getWordPressArgs = (rawHTML: string): Prompt[] => [
  {
    id: "wordPressArgs",
    model: "gpt-3.5-turbo-1106",
    role: "user",
    content: `
      Given the HTML content of a WordPress Travel Blog post:
      - HTML: '''${rawHTML}'''

      Perform the following tasks:
      
      1. Suggest Tags based on the content. Options include:
         - Specific cities or countries
         - Types of activities
         - Travel seasons
         - Accommodation types
         - Travel styles
         - Culinary terms
         - Travel concerns
         - Cultural aspects
         - Natural attractions
         - Transportation

      2. Suggest appropriate Post Categories. Options include:
         - Destinations
         - Trip Planning
         - Travel Tips
         - Adventure Travel
         - Cultural Experiences
         - Food and Drink
         - Budget Travel
         - Luxury Travel
         - Solo Travel
         - Family Travel
         - Reviews

      3. Suggest a Slug for the post, following SEO best practices such as using keywords, keeping it concise, and ensuring it reflects the post content.

      Organize the suggestions in the following JSON structure:

      {
        "tags": ["string1", "string2", ...],
        "categories": ["string1", "string2", ...],
        "slug": "example-slug-based-on-seo-best-practices"
      }
    `,
    schema: {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: {
            type: "string",
          },
        },
        categories: {
          type: "array",
          items: {
            type: "string",
          },
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
