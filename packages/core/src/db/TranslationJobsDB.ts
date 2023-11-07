import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import { z } from "zod";

export const TRANSLATION_JOBS_TABLE = "TranslationJobs";

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamoDB = DynamoDBDocumentClient.from(client);

interface JobInput {
  jobId: string;
  language: string;
  email: string;
  password: string;
  targetBlogURL: string;
}

interface Job extends JobInput {
  createdAt: string;
  lastAccessedAt: string;
  referenceCount: number;
}

export const validateJob = (job: JobInput) => {
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

export const createJob = async (job: JobInput) => {
  const command = new PutCommand({
    TableName: Table.TranslationJobs.tableName,
    Item: {
      ...job,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    },
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

export const getJobs = async (
  filter?: (job: Job) => boolean
): Promise<Job[]> => {
  const command = new ScanCommand({
    TableName: Table.TranslationJobs.tableName,
  });
  const res = await dynamoDB.send(command);
  let jobs = (res.Items as Job[]) || [];

  if (filter) {
    jobs = jobs.filter(filter);
  }

  return jobs;
};

export const deleteJob = async (jobId: string) => {
  const command = new DeleteCommand({
    TableName: Table.TranslationJobs.tableName,
    Key: { jobId },
  });
  return await dynamoDB.send(command);
};

export const updateJobReferenceCount = async (
  jobId: string,
  action: "add" | "remove",
  value: number
) => {
  const command = new UpdateCommand({
    TableName: Table.TranslationJobs.tableName,
    Key: { jobId },
    UpdateExpression:
      action === "add"
        ? "add referenceCount :val set lastAccessedAt = :lastAccessedAt"
        : "subtract referenceCount :val set lastAccessedAt = :lastAccessedAt",
    ExpressionAttributeValues: {
      ":val": value,
      ":lastAccessedAt": new Date().toISOString(),
    },
  });
  return await dynamoDB.send(command);
};
