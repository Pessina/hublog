import { Config } from "sst/node/config";
import { ChatGptService, contentPrompts } from "../gpt";
import { event } from "./translation.event";
import { z } from "zod";
import crypto from "crypto";

export const Events = {
  Created: event("todo.created", {
    id: z.string(),
    html: z.string(),
  }),
};

export async function create(html: string) {
  const id = crypto.randomUUID();

  await Events.Created.publish({
    id,
    html,
  });
}

export const translateHTML = async (html: string) => {
  const gptService = new ChatGptService(Config.OPEN_AI_KEY);

  const translatedContent = await gptService.runGPTPipeline(
    contentPrompts.extractMainContentAsHTML(html, "en-US")
  );

  return translatedContent.messages[0];
};
