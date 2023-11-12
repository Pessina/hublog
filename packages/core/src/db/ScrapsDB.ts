import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

export const SCRAPS_DB_TABLE = "ScrapsDB";

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

interface ScrapInput {
  source: string;
  html: string;
}

interface Scrap extends ScrapInput {
  createdAt: string;
  updatedAt: string;
}

export const createOrUpdateScrap = async (scrap: ScrapInput) => {
  const existingScrap = await getScrap(scrap.source);
  if (existingScrap) {
    const command = new UpdateCommand({
      TableName: Table.ScrapsDB.tableName,
      Key: { source: scrap.source },
      UpdateExpression: "set html = :h, updatedAt = :u",
      ExpressionAttributeValues: {
        ":h": scrap.html,
        ":u": new Date().toISOString(),
      },
    });

    return await dynamoDB.send(command);
  } else {
    const command = new PutCommand({
      TableName: Table.ScrapsDB.tableName,
      Item: {
        ...scrap,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    return await dynamoDB.send(command);
  }
};

export const getScrap = async (source: string): Promise<Scrap | null> => {
  const command = new GetCommand({
    TableName: Table.ScrapsDB.tableName,
    Key: { source },
  });
  const res = await dynamoDB.send(command);
  return (res.Item as Scrap) || null;
};

export const deleteScrap = async (source: string) => {
  const command = new DeleteCommand({
    TableName: Table.ScrapsDB.tableName,
    Key: { source },
  });
  return await dynamoDB.send(command);
};
