import { Config } from "sst/node/config";
import { ChatGptService, contentPrompts } from "../gpt";
import { wordPressPrompts } from "../gpt/prompts/wordPress.prompt";

export const translateText = async (text: string, language: string) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const translatedContent = await gptService.runGPTPipeline(
    contentPrompts.translateText(text, language)
  );

  return translatedContent.messages[0];
};

export const cleanContent = async (html: string) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const cleanedContent = await gptService.runGPTPipeline(
    contentPrompts.cleanContent(html)
  );

  return cleanedContent.messages[0];
};

export const improveContent = async (html: string) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const cleanedContent = await gptService.runGPTPipeline(
    contentPrompts.improveContent(html)
  );

  return cleanedContent.messages[0];
};

export const getWordPressSEOArgs = async (
  html: string,
  targetLanguage: string
) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const wordPressArgs = await gptService.runGPTPipeline(
    wordPressPrompts.getWordPressSEOArgs(html, targetLanguage)
  );

  return JSON.parse(wordPressArgs.messages[0]) as {
    title: string;
    metaDescription: string;
    slug: string;
  };
};

export const getWordPressClassificationArgs = async (
  html: string,
  tags: string[],
  categories: string[]
) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const wordPressClassificationArgs = await gptService.runGPTPipeline(
    wordPressPrompts.getWordPressClassificationArgs(html, tags, categories)
  );

  return JSON.parse(wordPressClassificationArgs.messages[0]) as {
    tags: string[];
    categories: string[];
  };
};
