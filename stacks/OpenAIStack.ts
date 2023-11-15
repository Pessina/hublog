import { Api, Table, Queue, Config, Function } from "sst/constructs";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { DefinitionBody, StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { StackContext } from "sst/constructs";
import { Duration } from "aws-cdk-lib";
import core from "@hublog/core/src/OpenAIStack";

export function OpenAIStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");

  const APIRetryTable = new Table(stack, "APIRetry", {
    fields: {
      id: "string",
      retryCount: "number",
      lastAttemptTime: "string",
    },
    primaryIndex: { partitionKey: "id" },
  });

  const gptPromptHandler = new Function(stack, "GPTPromptHandler", {
    handler: "packages/functions/src/openAIStack.gptPromptHandler",
    bind: [OPEN_AI_KEY],
  });

  const gptPromptSuccess = new Function(stack, "GPTPromptSuccess", {
    handler: "packages/functions/src/openAIStack.gptPromptSuccess",
    bind: [APIRetryTable],
  });

  const gptPromptFail = new Function(stack, "GPTPromptFail", {
    handler: "packages/functions/src/openAIStack.gptPromptFail",
    bind: [APIRetryTable],
  });

  const retryStateMachine = new StateMachine(stack, "GPTPromptRetry", {
    definitionBody: DefinitionBody.fromChainable(
      new LambdaInvoke(stack, "Invoke GPT Prompt Handler", {
        lambdaFunction: gptPromptHandler,
      })
        .addRetry({
          interval: Duration.seconds(5),
          backoffRate: 2.0,
          maxAttempts: 2,
        })
        .addCatch(
          new LambdaInvoke(stack, "Invoke GPT Prompt Fail Handler", {
            lambdaFunction: gptPromptFail,
          })
        )
        .next(
          new LambdaInvoke(stack, "Invoke GPT Prompt Success Handler", {
            lambdaFunction: gptPromptSuccess,
          })
        )
    ),
    timeout: Duration.minutes(5),
  });

  const dlq = new Queue(stack, "DlqOpenAIStack");

  const gptPromptQueue = new Queue(stack, "GPTPrompt", {
    consumer: {
      function: {
        handler: "packages/functions/src/openAIStack.gptPromptQueueConsumer",
        bind: [],
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

  const api = new Api(stack, "OpenAIStackAPI", {
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

  return {
    ApiEndpoint: api.url,
  };
}
