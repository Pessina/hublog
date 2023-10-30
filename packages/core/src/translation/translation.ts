import { Config } from "sst/node/config";
import { ChatGptService, contentPrompts } from "../gpt";

export const translateHTML = async (html: string, language: string) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const translatedContent = await gptService.runGPTPipeline(
    contentPrompts.extractMainContentAsHTML(html, language)
  );

  return translatedContent.messages[0];
};
