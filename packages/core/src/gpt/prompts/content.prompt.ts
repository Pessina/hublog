import { Prompt } from "./prompt.types";

const cleanContent = (text: string): Prompt[] => [
  {
    id: "cleanContent",
    model: "gpt-3.5-turbo-1106",
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
];

// TODO: Add a prompt to break content by headers, paragraph and sections
const improveContent = (text: string): Prompt[] => [
  {
    id: "improveContent",
    model: "gpt-3.5-turbo-1106",
    role: "user",
    content: `
    - HTML: '''${text}'''

    Enhance the text to ensure it is engaging and easy to read, while preserving the original meaning of the content.
    
    NOTE: 
      - Do not change the language of the content
      - Do not remove any HTML tag
      - Your answer should be the HTML, nothing else, without quotes around the output
`,
  },
];

const translateText = (text: string, targetLanguage: string): Prompt[] => [
  {
    id: "translateText",
    model: "gpt-3.5-turbo-1106",
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
