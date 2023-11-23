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
