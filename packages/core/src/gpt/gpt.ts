import axios from "axios";
import { PromptSchema, Prompt, ModelNames } from "./prompts/prompt.types";

export type Message = {
  role: string;
  content: string;
};

export type GptResponse = {
  message: string;
};

export type GptPipelineResponse = {
  messages: string[];
};

export class ChatGptService {
  private baseURL = "https://api.openai.com/v1/chat/completions";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async gpt(
    modelName: ModelNames = "gpt-4",
    messages: Message[],
    schema?: PromptSchema
  ): Promise<GptResponse> {
    try {
      const headers = {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      };

      const data = {
        model: modelName,
        temperature: 0,
        messages: messages,
        ...(schema ? { functions: [{ name: "res", parameters: schema }] } : {}),
      };

      const response = await axios.post(this.baseURL, data, { headers });
      const messageContent = response?.data.choices[0].message;

      let retMessage;
      if (schema) {
        retMessage = messageContent.function_call.arguments;
      } else {
        retMessage = messageContent.content;
      }

      return { message: retMessage };
    } catch (error) {
      console.error(error);
      throw new Error(`Error fetching from GPT: ${error}`);
    }
  }

  async runGPTPipeline(prompts: Prompt[]): Promise<GptPipelineResponse> {
    try {
      const responses: { [key: string]: string } = {};
      const result: string[] = [];

      for (const prompt of prompts) {
        let content = prompt.content;

        for (const id in responses) {
          content = content.replace("{" + id + "}", responses[id]);
        }

        const messages: Message[] = [{ role: prompt.role, content: content }];
        const schema = prompt.schema;

        const response = await this.gpt(prompt.model, messages, schema);

        responses[prompt.id] = response.message;
        result.push(response.message);
      }

      return { messages: result };
    } catch (error) {
      console.error(error);
      throw new Error(`Error running GPT pipeline: ${error}`);
    }
  }
}
