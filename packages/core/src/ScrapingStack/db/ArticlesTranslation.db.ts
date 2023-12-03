import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

import { z } from "zod";

export const articleTranslationInputSchema = z.object({
  source: z.string(),
  title: z.string(),
  metaDescription: z.string(),
  slug: z.string(),
  html: z.string(),
  language: z.string(),
});

export const articleTranslationSchema = articleTranslationInputSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
});

type ArticleTranslationInput = z.infer<typeof articleTranslationInputSchema>;
type ArticleTranslation = z.infer<typeof articleTranslationSchema>;

export const put = async (articleTranslation: ArticleTranslationInput) => {
  const command = new PutCommand({
    TableName: Table.TranslatedArticlesTable.tableName,
    Item: {
      ...articleTranslation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  return await dynamoDB.send(command);
};

export const get = async (
  source: string,
  language: string
): Promise<ArticleTranslation | null> => {
  const command = new GetCommand({
    TableName: Table.TranslatedArticlesTable.tableName,
    Key: { source, language },
  });
  const res = await dynamoDB.send(command);
  return (res.Item as ArticleTranslation) || null;
};
