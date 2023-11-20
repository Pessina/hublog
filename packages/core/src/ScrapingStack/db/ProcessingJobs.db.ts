import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

export const createProcessingJob = async (args: {
  groupId: string;
  partIndex: number;
  totalParts: number;
  status: string;
  content: string;
}) => {
  const command = new PutCommand({
    TableName: Table.ProcessingJobs.tableName,
    Item: {
      groupId: args.groupId,
      partIndex: args.partIndex,
      totalParts: args.totalParts,
      status: args.status,
      content: args.content,
    },
  });
  return await dynamoDB.send(command);
};

export const checkAndGetProcessingJobs = async (groupId: string) => {
  const command = new QueryCommand({
    TableName: Table.ProcessingJobs.tableName,
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
      return data.Items.sort((a, b) => a.partIndex - b.partIndex);
    }
  }

  return null;
};
