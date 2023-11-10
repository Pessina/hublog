export type SchemaValue = string | PromptSchema;
export type PromptSchema = { [key: string]: SchemaValue };

export type ModelNames = "gpt-3.5-turbo" | "gpt-3.5-turbo-1106" | "gpt-4";

export type Prompt = {
  content: string;
  role: string;
  model: ModelNames;
  id: string;
  schema?: PromptSchema;
};
