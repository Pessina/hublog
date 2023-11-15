import { z } from "zod";
import core from "@hublog/core/src/OpenAIStack";
import { gptPromptQueueMessageSchema } from "../queue/GPTPrompt.queue";

export type ChatGptRequest = z.infer<typeof core.API.schemas.gptPromptSchema>;
export type GPTPromptQueueMessage = z.infer<typeof gptPromptQueueMessageSchema>;
