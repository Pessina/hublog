import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
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
  retries: z.number(),
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
        retries: args.retries,
      },
    });
    await dynamoDB.send(command);
  }
};

export const get = async (
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
    const validatedItems = data.Items.map((item) =>
      Utils.zodValidate(item, processingTranslationSchema)
    );
    const allImproved = validatedItems.every(
      (item) => item.status === "IMPROVED"
    );

    if (allImproved) {
      return validatedItems.sort((a, b) => a.partIndex - b.partIndex);
    }
  }

  return null;
};

export const deleteProcessingTranslationsByGroupId = async (
  groupId: string
): Promise<void> => {
  const command = new ScanCommand({
    TableName: Table.ProcessingTranslationTable.tableName,
    FilterExpression: "groupId = :groupId",
    ExpressionAttributeValues: {
      ":groupId": { S: groupId },
    },
  });

  const data = await dynamoDB.send(command);

  if (data.Items) {
    for (const item of data.Items) {
      const deleteCommand = new DeleteCommand({
        TableName: Table.ProcessingTranslationTable.tableName,
        Key: {
          groupId: item.groupId.S,
          partIndex: Number(item.partIndex.N),
        },
      });

      await dynamoDB.send(deleteCommand);
    }
  }
};

export const countIncompleteGroupIds = async (): Promise<number> => {
  const command = new ScanCommand({
    TableName: Table.ProcessingTranslationTable.tableName,
    FilterExpression: "#st <> :status",
    ExpressionAttributeNames: {
      "#st": "status",
    },
    ExpressionAttributeValues: {
      ":status": { S: "IMPROVED" },
    },
  });

  const data = await dynamoDB.send(command);

  if (data.Items) {
    const uniqueGroupIds = new Set(data.Items.map((item) => item.groupId.S));
    return uniqueGroupIds.size;
  }

  return 0;
};

export const updateRetries = async (
  groupId: string,
  partIndex: number,
  retries: number
): Promise<void> => {
  const command = new UpdateCommand({
    TableName: Table.ProcessingTranslationTable.tableName,
    Key: {
      groupId,
      partIndex,
    },
    UpdateExpression: "set retries = :r",
    ExpressionAttributeValues: {
      ":r": Number(retries),
    },
  });
  await dynamoDB.send(command);
};

export const getEntriesWithRetriesAbove = async (
  retriesThreshold: number
): Promise<Array<ProcessingTranslation>> => {
  const command = new ScanCommand({
    TableName: Table.ProcessingTranslationTable.tableName,
    FilterExpression: "retries > :retries",
    ExpressionAttributeValues: {
      ":retries": { N: retriesThreshold.toString() },
    },
  });

  const data = await dynamoDB.send(command);

  return data.Items
    ? data.Items.map((item) => ({
        groupId: item.groupId.S || "",
        partIndex: Number(item.partIndex.N),
        totalParts: Number(item.totalParts.N),
        status: item.status.S as ProcessingTranslationStatus,
        content: item.content.S || "",
        retries: Number(item.retries.N),
      }))
    : [];
};
