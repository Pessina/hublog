import { z } from "zod";
import Utils from "@hublog/core/src/utils";

export const gptPromptRequestSchema = z.object({
  callbackURL: z.string().url(),
  prompt: Utils.GPT.gptPromptSchema,
});

export const gptHandlerSuccessResponseSchema = z.object({
  callbackURL: z.string().url(),
  response: z.union([
    Utils.GPT.functionResponseSchema,
    Utils.GPT.defaultResponseSchema,
  ]),
});

export const gptHandlerErrorResponseSchema = z.object({
  callbackURL: z.string().url(),
  response: Utils.error.errorSchema,
});
