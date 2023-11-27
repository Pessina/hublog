import { GPTPrompt } from "../schemas/types";

// TODO: Improve prompt to retrieve only html, without quoted around. You can use the JSON output format
const cleanContent = (text: string): GPTPrompt => ({
  model: "gpt-3.5-turbo-1106",
  messages: [
    {
      role: "user",
      content: `
      - HTML: '''${text}'''
  
      Remove from the HTML all:
        - Suggestion/recommendation to other blog posts
        - Formulary
        - Reference to the original author/blog
      
      NOTE: 
        - Do not change the language of the content
        - Do not remove any HTML tag
        - Your answer should be the HTML, nothing else, without quotes around the output
  `,
    },
  ],
});

const translateText = (text: string, targetLanguage: string): GPTPrompt => ({
  model: "gpt-3.5-turbo-1106",
  messages: [
    {
      role: "user",
      content: `
    - HTML: '''${text}'''
    - Target Language: '''${targetLanguage}'''

    Translate the HTML to the target language. 

    NOTE: 
      - Do not remove any HTMl tag
      - Your answer should be the HTML, nothing else, without quotes around the output
`,
    },
  ],
});

// TODO: Add a prompt to break content by headers, paragraph and sections to improve readability
const improveReadability = (
  text: string,
  targetLanguage: string
): GPTPrompt => ({
  model: "gpt-3.5-turbo-1106",
  messages: [
    {
      role: "user",
      content: `
    - HTML: '''${text}'''
    - Target Language: '''${targetLanguage}'''

    Enhance the text to ensure it is engaging and easy to read, while preserving the original meaning of the content.
    
    NOTE: 
      - The content should be crafted in a way that is natural for speakers of the target language
      - Do not remove any HTML tag
      - Your answer should be the HTML, nothing else, without quotes around the output
`,
    },
  ],
});

const getSEOArgs = (rawHTML: string, targetLanguage: string): GPTPrompt => ({
  model: "gpt-3.5-turbo-1106",
  response_format: { type: "json_object" },
  messages: [
    {
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
    },
  ],
});

export const contentPrompts = {
  getSEOArgs,
  translateText,
  cleanContent,
  improveReadability,
};
