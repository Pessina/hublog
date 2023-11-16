import { z } from "zod";
import { gptPromptSchema } from "./schemas";

export type GPTPrompt = z.infer<typeof gptPromptSchema>;
