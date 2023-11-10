import { Prompt } from "./prompt.types";

const cleanContent = (text: string): Prompt[] => [
  {
    id: "removeNonMainContentText",
    model: "gpt-3.5-turbo-1106",
    role: "user",
    content: `
    - HTML: '''${text}'''

    Remove from the HTML all suggestion/recommendation to other blog posts
    Remove from the HTML all the formulary
    Remove from the HTML all the reference to the original author/blog

    NOTE: 
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
};
