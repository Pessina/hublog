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

interface DynamoDBConfig {
  TableName: string;
}

export const createJob = async (job: Job, config: DynamoDBConfig) => {
  const command = new PutCommand({
    TableName: config.TableName,
    Item: job,
  });
  return await dynamoDB.send(command);
};

export const readJob = async (jobId: string, config: DynamoDBConfig) => {
  const command = new GetCommand({
    TableName: config.TableName,
    Key: { jobId: jobId },
  });
  return await dynamoDB.send(command);
};

export const updateJob = async (
  jobId: string,
  updatedJob: Job,
  config: DynamoDBConfig
) => {
  const command = new UpdateCommand({
    TableName: config.TableName,
    Key: { jobId: jobId },
    UpdateExpression: "SET #job = :job",
    ExpressionAttributeNames: { "#job": "job" },
    ExpressionAttributeValues: { ":job": updatedJob },
    ReturnValues: "ALL_NEW",
  });
  return await dynamoDB.send(command);
};

export const deleteJob = async (jobId: string, config: DynamoDBConfig) => {
  const command = new DeleteCommand({
    TableName: config.TableName,
    Key: { jobId: jobId },
  });
  return await dynamoDB.send(command);
};
