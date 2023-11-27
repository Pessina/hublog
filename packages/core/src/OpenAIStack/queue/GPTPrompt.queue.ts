import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

import { Queue } from "sst/node/queue";
import { z } from "zod";
import Utils from "../../utils";
import { gptPromptRequestSchema } from "../api/schemas";

const client = new SQSClient();

export async function emit(request: z.infer<typeof gptPromptRequestSchema>) {
  const message = Utils.zodValidate(request, gptPromptRequestSchema);
  const command = new SendMessageCommand({
    QueueUrl: Queue.GPTPrompt.queueUrl,
    MessageBody: JSON.stringify(message),
  });

  return await client.send(command);
}
