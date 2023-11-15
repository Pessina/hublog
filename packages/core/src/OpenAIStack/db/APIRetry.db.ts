import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

interface APIRetryItem {
  id: string;
  retryCount: number;
  lastAttemptTime: string;
}

export class APIRetryDB {
  private client: DynamoDBClient;
  private tableName: string;

  constructor() {
    this.client = new DynamoDBClient();
    this.tableName = Table.APIRetry.tableName;
  }

  async get(id: string) {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id },
    });
    const response = await this.client.send(command);
    return response.Item as APIRetryItem | undefined;
  }

  private async update(
    id: string,
    retryCount: number,
    lastAttemptTime: string
  ) {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: "set retryCount = :r, lastAttemptTime = :l",
      ExpressionAttributeValues: {
        ":r": retryCount,
        ":l": lastAttemptTime,
      },
    });
    await this.client.send(command);
  }

  async incrementRetryCount(id: string) {
    const item = await this.get(id);
    if (item) {
      const retryCount = Number(item.retryCount) + 1;
      await this.update(id, retryCount, new Date().toISOString());
    } else {
      await this.create({
        id,
        retryCount: 1,
        lastAttemptTime: new Date().toISOString(),
      });
    }
  }

  async resetRetryCount(id: string) {
    await this.delete(id);
  }

  async delete(id: string) {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { id },
    });
    await this.client.send(command);
  }

  async create({ id, retryCount, lastAttemptTime }: APIRetryItem) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        id,
        retryCount: retryCount.toString(),
        lastAttemptTime: lastAttemptTime,
      },
    });
    await this.client.send(command);
  }
}
