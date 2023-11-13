import { z } from "zod";
import { chatGptRequestSchema } from "../api";

export type ChatGptRequest = z.infer<typeof chatGptRequestSchema>;
