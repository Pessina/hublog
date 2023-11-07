import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import { z } from "zod";

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

export const validateJob = (job: Job) => {
  const jobSchema = z.object({
    jobId: z.string(),
    language: z.string(),
    email: z.string().email(),
    password: z.string(),
    targetBlogURL: z.string().url(),
  });

  const parsedJob = jobSchema.safeParse(job);

  if (!parsedJob.success) {
    throw new Error(`Invalid job data: ${parsedJob.error}`);
  }

  return parsedJob.data;
};

export const createJob = async (job: Job) => {
  const command = new PutCommand({
    TableName: Table.TranslationJobs.tableName,
    Item: { ...job, createdAt: new Date().toISOString() },
  });
  return await dynamoDB.send(command);
};

export const getJob = async (jobId: string): Promise<Job> => {
  const command = new GetCommand({
    TableName: Table.TranslationJobs.tableName,
    Key: { jobId },
  });
  const res = await dynamoDB.send(command);
  if (!res.Item) {
    throw new Error(`Job ${jobId} not found`);
  }

  return res.Item as Job;
};

export const deleteJob = async (jobId: string) => {
  const command = new DeleteCommand({
    TableName: Table.TranslationJobs.tableName,
    Key: { jobId },
  });
  return await dynamoDB.send(command);
};
