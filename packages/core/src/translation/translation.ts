import { Config } from "sst/node/config";
import { ChatGptService, contentPrompts } from "../gpt";

export const translateHTML = async (html: string, language: string) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const translatedContent = await gptService.runGPTPipeline(
    contentPrompts.translation(html, language)
  );

  return translatedContent.messages[0];
};

export const cleanHTML = async (html: string) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const cleanedContent = await gptService.runGPTPipeline(
    contentPrompts.clean(html)
  );

  return cleanedContent.messages[0];
};
