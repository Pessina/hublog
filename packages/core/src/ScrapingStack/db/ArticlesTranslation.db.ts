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

interface ArticleTranslationInput {
  source: string;
  title: string;
  metaDescription: string;
  slug: string;
  html: string;
  language: string;
}

interface ArticleTranslation extends ArticleTranslationInput {
  createdAt: string;
  updatedAt: string;
}

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

export const update = async (
  source: string,
  language: string,
  articleTranslation: Partial<
    Omit<ArticleTranslationInput, "source" | "language">
  >
) => {
  const command = new UpdateCommand({
    TableName: Table.TranslatedArticlesTable.tableName,
    Key: {
      source: source,
      language: language,
    },
    UpdateExpression:
      "set title = :t, metaDescription = :m, slug = :s, html = :h, updatedAt = :u",
    ExpressionAttributeValues: {
      ":t": articleTranslation.title,
      ":m": articleTranslation.metaDescription,
      ":s": articleTranslation.slug,
      ":h": articleTranslation.html,
      ":u": new Date().toISOString(),
    },
  });

  return await dynamoDB.send(command);
};
