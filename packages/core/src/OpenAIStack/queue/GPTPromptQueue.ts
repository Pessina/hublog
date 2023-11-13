import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

import { validateChatGptRequest } from "../api/validation";
import { ChatGptRequest } from "../types";
import { Queue } from "sst/node/queue";

const client = new SQSClient();

export async function emit(request: ChatGptRequest) {
  validateChatGptRequest(request);
  const command = new SendMessageCommand({
    QueueUrl: Queue.GPTPromptQueue.queueUrl,
    MessageBody: JSON.stringify(request),
  });

  return await client.send(command);
}

export async function consume() {
  const command = new ReceiveMessageCommand({
    QueueUrl: Queue.GPTPromptQueue.queueUrl,
    MaxNumberOfMessages: 1,
  });

  const response = await client.send(command);
  if (response.Messages) {
    const message = response.Messages[0];
    const receiptHandle = message.ReceiptHandle;
    const messageBody = message.Body ? JSON.parse(message.Body) : {};
    const messageData = validateChatGptRequest(messageBody);
    return { receiptHandle, messageData };
  }
}

export async function remove(receiptHandle: string) {
  const command = new DeleteMessageCommand({
    QueueUrl: Queue.GPTPromptQueue.queueUrl,
    ReceiptHandle: receiptHandle,
  });

  return await client.send(command);
}
