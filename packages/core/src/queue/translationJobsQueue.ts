import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
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

export const emitEvent = async (data: TranslationJobsQueueSchema) => {
  const validData = validate(data);

  if (validData) {
    const command = new SendMessageCommand({
      QueueUrl: Queue.TranslationJobsQueue.queueUrl,
      MessageBody: JSON.stringify(validData),
    });
    await sqs.send(command);
  }
};

export const consumeEvent = async (
  message: string
): Promise<TranslationJobsQueueSchema> => {
  const parsedMessage = JSON.parse(message);
  const validData = validate(parsedMessage);
  return validData;
};
