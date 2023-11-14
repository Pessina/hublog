import { z } from "zod";
import { chatGptRequestSchema } from "../validation";
import { gptPromptQueueMessageSchema } from "../queue/GPTPrompt.queue";

export type ChatGptRequest = z.infer<typeof chatGptRequestSchema>;
export type GPTPromptQueueMessage = z.infer<typeof gptPromptQueueMessageSchema>;
