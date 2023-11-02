/*

TODO: 

- SST can't properly inject the table name (pessina-hublog...) when using the aws-sdk v3, so I had to use the full name in order for it to work
- If I use the v2 it won't recognize the import of the DynamoDB

*/
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export const TRANSLATION_JOBS_TABLE = "TranslationJobs";

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamoDB = DynamoDBDocumentClient.from(client);

interface Job {
  jobId: string;
  language: string;
  email: string;
  password: string;
  targetBlogURL: string;
}

export const createJob = async (job: Job) => {
  const command = new PutCommand({
    TableName: "pessina-hublog-hublog-TranslationJobs",
    Item: job,
  });
  return await dynamoDB.send(command);
};

export const readJob = async (jobId: string) => {
  const command = new GetCommand({
    TableName: "pessina-hublog-hublog-TranslationJobs",
    Key: { jobId: jobId },
  });
  return await dynamoDB.send(command);
};

export const updateJob = async (jobId: string, updatedJob: Job) => {
  const command = new UpdateCommand({
    TableName: "pessina-hublog-hublog-TranslationJobs",
    Key: { jobId: jobId },
    UpdateExpression: "SET #job = :job",
    ExpressionAttributeNames: { "#job": "job" },
    ExpressionAttributeValues: { ":job": updatedJob },
    ReturnValues: "ALL_NEW",
  });
  return await dynamoDB.send(command);
};

export const deleteJob = async (jobId: string) => {
  const command = new DeleteCommand({
    TableName: "pessina-hublog-hublog-TranslationJobs",
    Key: { jobId: jobId },
  });
  return await dynamoDB.send(command);
};
