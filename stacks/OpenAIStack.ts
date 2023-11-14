import { Api, Table, Queue, Config, Function } from "sst/constructs";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { StackContext } from "sst/constructs";
import { Duration } from "aws-cdk-lib";
import core from "@hublog/core/src/OpenAIStack";

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

  const dlq = new Queue(stack, "DeadLetterQueueOpenAIStack");

  const gptPromptHandler = new Function(stack, "GPTPromptHandler", {
    handler: "packages/functions/src/openAIStack.gptPromptHandler",
    bind: [OPEN_AI_KEY, APIRetryTable],
  });

  const retryStateMachine = new StateMachine(stack, "RetryStateMachine", {
    definition: new LambdaInvoke(stack, "Invoke ChatGPT API", {
      lambdaFunction: gptPromptHandler,
    }).addRetry({
      interval: Duration.seconds(1),
      backoffRate: 2.0,
      maxAttempts: 5,
      errors: ["RateLimitExceeded"],
    }),
    timeout: Duration.minutes(5),
  });

  const gptPromptQueue = new Queue(stack, "GPTPrompt", {
    consumer: {
      function: {
        handler: "packages/functions/src/openAIStack.gptQueueConsumer",
        bind: [APIRetryTable, OPEN_AI_KEY],
        environment: {
          STATE_MACHINE: retryStateMachine.stateMachineArn,
        },
        permissions: ["states:StartExecution"],
      },
    },
    cdk: {
      queue: {
        deadLetterQueue: {
          maxReceiveCount: 2,
          queue: dlq.cdk.queue,
        },
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
