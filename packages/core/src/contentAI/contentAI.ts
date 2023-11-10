import { Config } from "sst/node/config";
import { ChatGptService, contentPrompts } from "../gpt";

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