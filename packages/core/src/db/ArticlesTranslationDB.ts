import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

export const ARTICLES_TRANSLATIONS_DB_TABLE = "ArticlesTranslationsDB";

const client = new DynamoDBClient();
const dynamoDB = DynamoDBDocumentClient.from(client);

interface ArticleTranslationInput {
  source: string;
  html: string;
  language: string;
}

interface ArticleTranslation extends ArticleTranslationInput {
  createdAt: string;
  updatedAt: string;
}

export const createOrUpdateArticleTranslation = async (
  articleTranslation: ArticleTranslationInput
) => {
  const existingArticleTranslation = await getArticleTranslation(
    articleTranslation.source,
    articleTranslation.language
  );
  if (existingArticleTranslation) {
    const command = new UpdateCommand({
      TableName: Table.ArticlesTranslationsDB.tableName,
      Key: {
        source: articleTranslation.source,
        language: articleTranslation.language,
      },
      UpdateExpression: "set html = :h, updatedAt = :u",
      ExpressionAttributeValues: {
        ":h": articleTranslation.html,
        ":u": new Date().toISOString(),
      },
    });

    return await dynamoDB.send(command);
  } else {
    const command = new PutCommand({
      TableName: Table.ArticlesTranslationsDB.tableName,
      Item: {
        ...articleTranslation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    return await dynamoDB.send(command);
  }
};

export const getArticleTranslation = async (
  source: string,
  language: string
): Promise<ArticleTranslation | null> => {
  const command = new GetCommand({
    TableName: Table.ArticlesTranslationsDB.tableName,
    Key: { source, language },
  });
  const res = await dynamoDB.send(command);
  return (res.Item as ArticleTranslation) || null;
};

export const deleteArticleTranslation = async (source: string) => {
  const command = new DeleteCommand({
    TableName: Table.ArticlesTranslationsDB.tableName,
    Key: { source },
  });
  return await dynamoDB.send(command);
};
