import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

import { z } from "zod";
import Utils from "../../utils";

export enum ProcessingTranslationStatus {
  INITIAL = "INITIAL",
  CLEAN = "CLEAN",
  TRANSLATED = "TRANSLATED",
  IMPROVED = "IMPROVED",
}

export const processingTranslationSchema = z.object({
  groupId: z.string(),
  partIndex: z.number(),
  totalParts: z.number(),
  status: z.nativeEnum(ProcessingTranslationStatus),
  content: z.string(),
});

type ProcessingTranslation = z.infer<typeof processingTranslationSchema>;

export const put = async (args: ProcessingTranslation): Promise<void> => {
  const statusHierarchy = Object.values(ProcessingTranslationStatus);
  const existingJob = await get(args.groupId, args.partIndex);

  if (
    !existingJob ||
    statusHierarchy.indexOf(existingJob.status) <
      statusHierarchy.indexOf(args.status)
  ) {
    const command = new PutCommand({
      TableName: Table.ProcessingTranslationTable.tableName,
      Item: {
        groupId: args.groupId,
        partIndex: args.partIndex,
        totalParts: args.totalParts,
        status: args.status,
        content: args.content,
      },
    });
    await dynamoDB.send(command);
  }
};

const get = async (
  groupId: string,
  partIndex: number
): Promise<ProcessingTranslation | null> => {
  const command = new QueryCommand({
    TableName: Table.ProcessingTranslationTable.tableName,
    KeyConditionExpression: "groupId = :groupId and partIndex = :partIndex",
    ExpressionAttributeValues: {
      ":groupId": groupId,
      ":partIndex": partIndex,
    },
  });

  const data = await dynamoDB.send(command);

  if (data.Items && data.Items.length > 0) {
    return Utils.zodValidate(data.Items[0], processingTranslationSchema);
  }

  return null;
};

export const validateAndRetrieveProcessingTranslations = async (
  groupId: string
): Promise<Array<ProcessingTranslation> | null> => {
  const command = new QueryCommand({
    TableName: Table.ProcessingTranslationTable.tableName,
    KeyConditionExpression: "groupId = :groupId",
    ExpressionAttributeValues: {
      ":groupId": groupId,
    },
    ScanIndexForward: true,
  });

  const data = await dynamoDB.send(command);

  if (data.Items) {
    const item = Utils.zodValidate(data.Items[0], processingTranslationSchema);

    if (data.Items.length === item.totalParts) {
      return data.Items.map((item) => ({
        groupId: item.groupId,
        partIndex: item.partIndex,
        totalParts: item.totalParts,
        status: item.status,
        content: item.content,
      })).sort((a, b) => a.partIndex - b.partIndex);
    }
  }

  return null;
};
