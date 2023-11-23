import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Queue } from "sst/node/queue";
import { z } from "zod";
import Utils from "../../utils";

const sqs = new SQSClient();

export const TRANSLATION_JOBS_QUEUE_NAME = "TranslationJobsQueue";

export const translationJobsQueueSchema = z.object({
  id: z.string(),
});

type TranslationJobsQueueSchema = z.infer<typeof translationJobsQueueSchema>;

export const emitMessage = async (data: TranslationJobsQueueSchema) => {
  const validData = Utils.zodValidate(data, translationJobsQueueSchema);

  if (validData) {
    const command = new SendMessageCommand({
      QueueUrl: Queue.TranslationJobsQueue.queueUrl,
      MessageBody: JSON.stringify(validData),
    });
    await sqs.send(command);
  }
};
