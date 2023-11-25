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

export const ProcessingJobSchema = z.object({
  groupId: z.string(),
  partIndex: z.number(),
  totalParts: z.number(),
  status: z.string(),
  content: z.string(),
});

type ProcessingJob = z.infer<typeof ProcessingJobSchema>;

export const createProcessingJob = async (
  args: ProcessingJob
): Promise<void> => {
  const command = new PutCommand({
    TableName: Table.ProcessingJobsTable.tableName,
    Item: {
      groupId: args.groupId,
      partIndex: args.partIndex,
      totalParts: args.totalParts,
      status: args.status,
      content: args.content,
    },
  });
  await dynamoDB.send(command);
};

export const getProcessingJob = async (
  groupId: string,
  partIndex: number
): Promise<ProcessingJob | null> => {
  const command = new QueryCommand({
    TableName: Table.ProcessingJobsTable.tableName,
    KeyConditionExpression: "groupId = :groupId and partIndex = :partIndex",
    ExpressionAttributeValues: {
      ":groupId": groupId,
      ":partIndex": partIndex,
    },
  });

  const data = await dynamoDB.send(command);

  if (data.Items && data.Items.length > 0) {
    const item = data.Items[0];
    return {
      groupId: item.groupId.S,
      partIndex: Number(item.partIndex.N),
      totalParts: Number(item.totalParts.N),
      status: item.status.S,
      content: item.content.S,
    };
  }

  return null;
};

export const checkAndGetProcessingJobs = async (
  groupId: string
): Promise<Array<ProcessingJob> | null> => {
  const command = new QueryCommand({
    TableName: Table.ProcessingJobsTable.tableName,
    KeyConditionExpression: "groupId = :groupId",
    ExpressionAttributeValues: {
      ":groupId": groupId,
    },
    ScanIndexForward: true,
  });

  const data = await dynamoDB.send(command);

  if (data.Items) {
    const totalParts = data.Items[0].totalParts;

    if (data.Items.length === totalParts) {
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
