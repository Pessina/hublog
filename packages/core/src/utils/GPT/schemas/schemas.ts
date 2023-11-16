import { z } from "zod";

const baseResponseSchema = {
  id: z.string(),
  object: z.literal("chat.completion"),
  created: z.number(),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
};

const baseChoiceSchema = {
  index: z.number(),
  message: z.object({
    role: z.literal("assistant"),
    content: z.string(),
  }),
  finish_reason: z.string(),
};

const functionChoiceSchema = {
  ...baseChoiceSchema,
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        type: z.literal("function"),
        function: z.object({
          name: z.string(),
          arguments: z.string(),
        }),
      })
    )
    .optional(),
};

export const defaultResponseSchema = z.object({
  ...baseResponseSchema,
  choices: z.array(z.object(baseChoiceSchema)),
});

export const functionResponseSchema = z.object({
  ...baseResponseSchema,
  choices: z.array(z.object(functionChoiceSchema)),
});
