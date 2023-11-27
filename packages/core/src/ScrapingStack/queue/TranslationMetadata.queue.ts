import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

import { Queue } from "sst/node/queue";
import { z } from "zod";
import Utils from "../../utils";

const client = new SQSClient();

export const translationMetadataQueueMessageSchema = z.object({
  id: z.string(),
});

export type TranslationMetadataQueueMessageSchema = z.infer<
  typeof translationMetadataQueueMessageSchema
>;

export async function emit(request: TranslationMetadataQueueMessageSchema) {
  const message = Utils.zodValidate(
    request,
    translationMetadataQueueMessageSchema
  );
  const command = new SendMessageCommand({
    QueueUrl: Queue.TranslationMetadataQueue.queueUrl,
    MessageBody: JSON.stringify(message),
    MessageGroupId: "ID",
  });

  return await client.send(command);
}
