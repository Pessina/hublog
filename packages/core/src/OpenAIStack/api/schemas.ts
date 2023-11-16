import { z } from "zod";
import Utils from "@hublog/core/src/utils";

export const gptPromptSchema = z.object({
  model: z.union([
    z.string(),
    z.literal("gpt-4"),
    z.literal("gpt-4-32k"),
    z.literal("gpt-3.5-turbo"),
    z.literal("gpt-3.5-turbo-16k"),
  ]),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ),
  frequency_penalty: z.number().optional(),
  presence_penalty: z.number().optional(),
  response_format: z
    .object({
      type: z.enum(["text", "json_object"]),
    })
    .optional(),
  seed: z.number().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  tools: z.array(z.string()).optional(),
  tool_choice: z
    .union([
      z.string(),
      z.object({
        type: z.string(),
        function: z
          .object({
            name: z.string(),
          })
          .optional(),
      }),
    ])
    .optional(),
});

export const gptPromptRequestSchema = z.object({
  callbackURL: z.string().url(),
  prompt: gptPromptSchema,
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
  message: z.string(),
});
