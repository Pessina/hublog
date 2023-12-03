import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

import { z } from "zod";

export const translatedArticlesInputSchema = z.object({
  source: z.string(),
  title: z.string(),
  metaDescription: z.string(),
  slug: z.string(),
  html: z.string(),
  language: z.string(),
});

export const translatedArticlesSchema = translatedArticlesInputSchema.extend({
  createdAt: z.string(),
  updatedAt: z.string(),
});

type TranslatedArticleInput = z.infer<typeof translatedArticlesInputSchema>;
type TranslatedArticle = z.infer<typeof translatedArticlesSchema>;

export const put = async (translatedArticle: TranslatedArticleInput) => {
  const command = new PutCommand({
    TableName: Table.TranslatedArticlesTable.tableName,
    Item: {
      ...translatedArticle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  return await dynamoDB.send(command);
};

export const get = async (
  source: string,
  language: string
): Promise<TranslatedArticle | null> => {
  const command = new GetCommand({
    TableName: Table.TranslatedArticlesTable.tableName,
    Key: { source, language },
  });
  const res = await dynamoDB.send(command);
  return (res.Item as TranslatedArticle) || null;
};
