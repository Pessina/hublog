import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  PutCommand,
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

interface APIRetryItem {
  model: string;
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

  async get(model: string) {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { model },
    });
    const response = await this.client.send(command);
    return response.Item as APIRetryItem | undefined;
  }

  private async update(
    model: string,
    retryCount: number,
    lastAttemptTime: string
  ) {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { model },
      UpdateExpression: "set retryCount = :r, lastAttemptTime = :l",
      ExpressionAttributeValues: {
        ":r": retryCount,
        ":l": lastAttemptTime,
      },
    });
    await this.client.send(command);
  }

  async incrementRetryCount(model: string) {
    const item = await this.get(model);
    if (item) {
      const retryCount = Number(item.retryCount) + 1;
      await this.update(model, retryCount, new Date().toISOString());
    } else {
      await this.create({
        model,
        retryCount: 1,
        lastAttemptTime: new Date().toISOString(),
      });
    }
  }

  async resetRetryCount(model: string) {
    await this.delete(model);
  }

  async delete(model: string) {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { model },
    });
    await this.client.send(command);
  }

  async create({ model, retryCount, lastAttemptTime }: APIRetryItem) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        model,
        retryCount: retryCount.toString(),
        lastAttemptTime: lastAttemptTime,
      },
    });
    await this.client.send(command);
  }
}
