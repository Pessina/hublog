import { Api, Table, Queue, Function } from "sst/constructs";
import { StackContext } from "sst/constructs";

export function OpenAIStack({ stack }: StackContext) {
  const queue = new Queue(stack, "GPTPromptQueue");

  const table = new Table(stack, "ExponentialRetryStatus", {
    fields: {
      model: "string",
      retryCount: "number",
      lastAttemptTime: "string",
    },
    primaryIndex: { partitionKey: "model" },
  });

  const api = new Api(stack, "Api", {
    routes: {
      "POST /chatgpt": {
        function: {
          handler: "packages/functions/src/openAIStack.gptAPIHandler",
          bind: [queue],
        },
      },
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
