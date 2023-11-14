import { Api, Table, Queue, Config } from "sst/constructs";
import { StackContext } from "sst/constructs";

export function OpenAIStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");

  const APIRetryTable = new Table(stack, "APIRetry", {
    fields: {
      model: "string",
      retryCount: "number",
      lastAttemptTime: "string",
    },
    primaryIndex: { partitionKey: "model" },
  });

  const gptPromptQueue = new Queue(stack, "GPTPrompt", {
    consumer: {
      function: {
        handler: "packages/functions/src/openAIStack.gptQueueConsumer",
        bind: [APIRetryTable, OPEN_AI_KEY],
      },
    },
  });

  const api = new Api(stack, "Api", {
    routes: {
      "POST /chatgpt": {
        function: {
          handler: "packages/functions/src/openAIStack.gptAPIHandler",
          bind: [gptPromptQueue],
        },
      },
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
