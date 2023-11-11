import { Prompt } from "./prompt.types";

const cleanContent = (text: string, targetLanguage: string): Prompt[] => [
  {
    id: "cleanContent",
    model: "gpt-3.5-turbo-16k",
    role: "user",
    content: `
    - HTML: '''${text}'''
    - Target Language: '''${targetLanguage}'''

    Remove from the HTML all:
      - Suggestion/recommendation to other blog posts
      - Formulary
      - Reference to the original author/blog
    
    NOTE: 
      - The content should be crafted in a way that is natural for speakers of the target language
      - Do not change the language of the content
      - Do not remove any HTML tag
      - Your answer should be the HTML, nothing else, without quotes around the output
`,
  },
];

// TODO: Add a prompt to break content by headers, paragraph and sections
const improveContent = (text: string, targetLanguage: string): Prompt[] => [
  {
    id: "improveContent",
    model: "gpt-3.5-turbo-16k",
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
];

const translateText = (text: string, targetLanguage: string): Prompt[] => [
  {
    id: "translateText",
    model: "gpt-3.5-turbo-16k",
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
];

export const contentPrompts = {
  translateText,
  cleanContent,
  improveContent,
};
