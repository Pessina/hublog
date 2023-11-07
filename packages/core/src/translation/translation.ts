import { Config } from "sst/node/config";
import { ChatGptService, contentPrompts } from "../gpt";
import { createForTranslation } from "./events";

export const translateHTML = async (html: string, language: string) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const translatedContent = await gptService.runGPTPipeline(
    contentPrompts.extractMainContentAsHTML(html, language)
  );

  return translatedContent.messages[0];
};

export const createEventForTranslation = async (
  html: string,
  jobId?: string
) => {
  await createForTranslation(html, jobId);
};
