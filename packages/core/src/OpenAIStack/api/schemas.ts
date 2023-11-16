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

const gptBaseResponseSchema = {
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

const gptBaseChoiceSchema = {
  index: z.number(),
  message: z.object({
    role: z.literal("assistant"),
    content: z.string(),
  }),
  finish_reason: z.string(),
};

const gptFunctionChoiceSchema = {
  ...gptBaseChoiceSchema,
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

export const gptDefaultResponseSchema = z.object({
  ...gptBaseResponseSchema,
  choices: z.array(z.object(gptBaseChoiceSchema)),
});

export const gptFunctionResponseSchema = z.object({
  ...gptBaseResponseSchema,
  choices: z.array(z.object(gptFunctionChoiceSchema)),
});

export const gptPromptRequestSchema = z.object({
  callbackURL: z.string().url(),
  prompt: gptPromptSchema,
});

export const gptPromptSuccessResponseSchema = z.object({
  callbackURL: z.string().url(),
  response: z.union([gptFunctionResponseSchema, gptDefaultResponseSchema]),
});

export const gptPromptErrorResponseSchema = z.object({
  callbackURL: z.string().url(),
  message: z.string(),
});
