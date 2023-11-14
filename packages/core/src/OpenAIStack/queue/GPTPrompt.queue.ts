import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

import { Queue } from "sst/node/queue";
import { z } from "zod";
import { chatGptRequestSchema, validate } from "../validation";

const client = new SQSClient();

export const gptPromptQueueMessageSchema = z.object({
  messageId: z.string(),
  receiptHandle: z.string(),
  body: z.string(),
  attributes: z.record(z.unknown()),
  messageAttributes: z.record(z.unknown()),
  md5OfBody: z.string(),
  eventSource: z.string(),
  eventSourceARN: z.string(),
  awsRegion: z.string(),
});

export async function emit(request: z.infer<typeof chatGptRequestSchema>) {
  const message = validate(request, chatGptRequestSchema);
  const command = new SendMessageCommand({
    QueueUrl: Queue.GPTPrompt.queueUrl,
    MessageBody: JSON.stringify(message),
  });

  return await client.send(command);
}

export async function consume() {
  const command = new ReceiveMessageCommand({
    QueueUrl: Queue.GPTPrompt.queueUrl,
    MaxNumberOfMessages: 1,
  });

  const response = await client.send(command);
  if (response.Messages) {
    const message = response.Messages[0];
    const receiptHandle = message.ReceiptHandle;
    if (receiptHandle) {
      const messageBody = message.Body ? JSON.parse(message.Body) : {};
      const messageData = validate(messageBody, gptPromptQueueMessageSchema);
      return { receiptHandle, messageData };
    }
  }
}

export async function remove(receiptHandle: string) {
  const command = new DeleteMessageCommand({
    QueueUrl: Queue.GPTPrompt.queueUrl,
    ReceiptHandle: receiptHandle,
  });

  return await client.send(command);
}
