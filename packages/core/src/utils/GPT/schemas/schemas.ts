import { z } from "zod";

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

export const responseSchema = z.union([
  functionResponseSchema,
  defaultResponseSchema,
]);
