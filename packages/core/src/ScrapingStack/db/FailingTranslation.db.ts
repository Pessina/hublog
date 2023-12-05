import { Table } from "sst/node/table";
import { z } from "zod";
import {
  GetCommand,
  PutCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const failingTranslationSchemaInput = z.object({
  originURL: z.string().url(),
  language: z.string(),
  reason: z.string(),
});

type FailingTranslationInput = Zod.infer<typeof failingTranslationSchemaInput>;

export const failingTranslationSchema = z.object({
  ...failingTranslationSchemaInput.shape,
  createdAt: z.string(),
  updatedAt: z.string(),
});

type FailingTranslation = Zod.infer<typeof failingTranslationSchema>;

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

export const get = async (
  originURL: string,
  language: string
): Promise<FailingTranslation | null> => {
  const command = new GetCommand({
    TableName: Table.FailingTranslationTable.tableName,
    Key: { originURL, language },
  });
  const res = await dynamoDB.send(command);
  return (res.Item as FailingTranslation) || null;
};

export const put = async (failingTranslation: FailingTranslationInput) => {
  const command = new PutCommand({
    TableName: Table.FailingTranslationTable.tableName,
    Item: {
      ...failingTranslation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  return await dynamoDB.send(command);
};
