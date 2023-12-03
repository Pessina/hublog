import OpenAI from "openai";
import { Config } from "sst/node/config";
import { GPTPrompt } from "./schemas/types";

export const callChatCompletions = async (prompt: GPTPrompt) => {
  const openAI = new OpenAI({ apiKey: Config.OPEN_AI_KEY });

  try {
    return await openAI.chat.completions.create(prompt);
  } catch (e: any) {
    switch (e?.error?.code) {
      case "context_length_exceeded":
        console.log(e);
      case "rate_limit_exceeded":
        console.log(e);
        throw new Error(e);
      default:
        throw new Error(e);
    }
  }
};
