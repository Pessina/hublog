import { z } from "zod";

export default function zodValidate<T>(obj: any, schema: z.ZodSchema<T>): T {
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
