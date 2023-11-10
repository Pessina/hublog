import { Config } from "sst/node/config";
import { ChatGptService, contentPrompts } from "../gpt";
import { createForTranslation } from "./events";

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

export const createEventForTranslation = async (
  title: string,
  metaDescription: string,
  html: string,
  jobId?: string
) => {
  await createForTranslation(title, metaDescription, html, jobId);
};
