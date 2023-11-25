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

export enum ProcessingJobStatus {
  INITIAL = "INITIAL",
  CLEAN = "CLEAN",
  TRANSLATED = "TRANSLATED",
  IMPROVED = "IMPROVED",
}

export const processingJobSchema = z.object({
  groupId: z.string(),
  partIndex: z.number(),
  totalParts: z.number(),
  status: z.nativeEnum(ProcessingJobStatus),
  content: z.string(),
});

type ProcessingJob = z.infer<typeof processingJobSchema>;

export const put = async (args: ProcessingJob): Promise<void> => {
  const statusHierarchy = Object.values(ProcessingJobStatus);
  const existingJob = await get(args.groupId, args.partIndex);

  if (
    !existingJob ||
    statusHierarchy.indexOf(existingJob.status) <
      statusHierarchy.indexOf(args.status)
  ) {
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
  }
};

const get = async (
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
    return Utils.zodValidate(data.Items[0], processingJobSchema);
  }

  return null;
};

export const validateAndRetrieveProcessingJobs = async (
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
    const item = Utils.zodValidate(data.Items[0], processingJobSchema);

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
