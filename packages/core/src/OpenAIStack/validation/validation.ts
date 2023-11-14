import { z } from "zod";

export const chatGptRequestSchema = z.object({
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

export function validate<T>(obj: any, schema: z.ZodSchema<T>): T {
  const result = schema.safeParse(obj);

  if (!result.success) {
    throw new Error(
      `Invalid request. Schema: ${JSON.stringify(
        schema
      )} Error: ${JSON.stringify(result.error)}`
    );
  }

  return result.data;
}
