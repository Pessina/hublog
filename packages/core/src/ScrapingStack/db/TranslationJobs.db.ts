import { Table } from "sst/node/table";
import { z } from "zod";
import crypto from "crypto";
import {
  GetCommand,
  PutCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const translationJobsSchemaInput = z.object({
  blogURL: z.string().url(),
  language: z.string(),
  email: z.string().email(),
  password: z.string(),
  originURL: z.string().url(),
});

type TranslationJobsSchemaInput = Zod.infer<typeof translationJobsSchemaInput>;
type TranslationJobsSchema = TranslationJobsSchemaInput & {
  id: string;
};

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

const get = async (id: string): Promise<TranslationJobsSchema | null> => {
  const command = new GetCommand({
    TableName: Table.TranslationJobsTable.tableName,
    Key: { id },
  });
  const res = await dynamoDB.send(command);
  return (res.Item as TranslationJobsSchema) || null;
};

const create = async (translationJob: TranslationJobsSchemaInput) => {
  const command = new PutCommand({
    TableName: Table.TranslationJobsTable.tableName,
    Item: {
      ...translationJob,
      id: crypto.randomUUID(),
    },
  });

  return await dynamoDB.send(command);
};

export { get, create };
