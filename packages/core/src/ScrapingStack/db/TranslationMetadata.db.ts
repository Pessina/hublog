import { Table } from "sst/node/table";
import { z } from "zod";
import crypto from "crypto";
import {
  GetCommand,
  PutCommand,
  DynamoDBDocumentClient,
  QueryCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const translationMetadataSchemaInput = z.object({
  blogURL: z.string().url(),
  language: z.string(),
  email: z.string().email(),
  password: z.string(),
  originURL: z.string().url(),
});

type TranslationMetadataSchemaInput = Zod.infer<
  typeof translationMetadataSchemaInput
>;

export const translationMetadataSchema = z.object({
  ...translationMetadataSchemaInput.shape,
  id: z.string(),
});

type TranslationMetadataSchema = Zod.infer<typeof translationMetadataSchema>;

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

export const get = async (
  id: string
): Promise<TranslationMetadataSchema | null> => {
  const command = new GetCommand({
    TableName: Table.TranslationMetadataTable.tableName,
    Key: { id },
  });
  const res = await dynamoDB.send(command);
  return (res.Item as TranslationMetadataSchema) || null;
};

export const create = async (
  translationMetadata: TranslationMetadataSchemaInput
) => {
  const command = new PutCommand({
    TableName: Table.TranslationMetadataTable.tableName,
    Item: {
      ...translationMetadata,
      id: crypto.randomUUID(),
    },
  });

  return await dynamoDB.send(command);
};

export const getByOriginURLAndLanguage = async (
  originURL: string,
  language: string
): Promise<Array<TranslationMetadataSchema> | null> => {
  const command = new ScanCommand({
    TableName: Table.TranslationMetadataTable.tableName,
    FilterExpression: "originURL = :originURL and #lang = :language",
    ExpressionAttributeValues: {
      ":originURL": originURL,
      ":language": language,
    },
    ExpressionAttributeNames: {
      "#lang": "language",
    },
  });
  const res = await dynamoDB.send(command);
  return (res.Items as Array<TranslationMetadataSchema>) || null;
};

export const deleteRecords = async (ids: Array<string>) => {
  const commands = ids.map(
    (id) =>
      new DeleteCommand({
        TableName: Table.TranslationMetadataTable.tableName,
        Key: { id },
      })
  );

  for (const command of commands) {
    await dynamoDB.send(command);
  }
};
