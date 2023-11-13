import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
} from "@aws-sdk/client-sqs";
import { Queue } from "sst/node/queue";
import { z } from "zod";

const sqs = new SQSClient();

export const TRANSLATION_JOBS_QUEUE_NAME = "TranslationJobsQueue";

type TranslationJobsQueueSchema = {
  blogURL: string;
  language: string;
  email: string;
  password: string;
  originURL: string;
};

export const translationJobsQueueSchema = z.object({
  blogURL: z.string().url(),
  language: z.string(),
  email: z.string().email(),
  password: z.string(),
  originURL: z.string().url(),
});

export const validate = (data: any) => {
  const result = translationJobsQueueSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Invalid data: ${result.error}`);
  }

  return result.data;
};

export const emitMessage = async (data: TranslationJobsQueueSchema) => {
  const validData = validate(data);

  if (validData) {
    const command = new SendMessageCommand({
      QueueUrl: Queue.TranslationJobsQueue.queueUrl,
      MessageBody: JSON.stringify(validData),
    });
    await sqs.send(command);
  }
};

export type TranslationJobsQueueMessage = {
  data: TranslationJobsQueueSchema;
  messageId: string;
};

export const consumeMessage =
  async (): Promise<TranslationJobsQueueMessage | null> => {
    const receiveMessageCommand = new ReceiveMessageCommand({
      QueueUrl: Queue.TranslationJobsQueue.queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 5,
    });
    const response = await sqs.send(receiveMessageCommand);

    if (response.Messages && response.Messages.length > 0) {
      const message = response.Messages[0];
      if (message.Body && message.ReceiptHandle) {
        const parsedMessage = JSON.parse(message.Body);
        const validData = validate(parsedMessage);
        return { data: validData, messageId: message.ReceiptHandle };
      }
    }

    return null;
  };

export const deleteMessage = async (messageId: string) => {
  const deleteMessageCommand = new DeleteMessageCommand({
    QueueUrl: Queue.TranslationJobsQueue.queueUrl,
    ReceiptHandle: messageId,
  });
  await sqs.send(deleteMessageCommand);
};
