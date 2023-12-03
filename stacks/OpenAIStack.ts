import { Api, Queue, Config, Function } from "sst/constructs";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { DefinitionBody, StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { StackContext } from "sst/constructs";
import { Duration } from "aws-cdk-lib";

export function OpenAIStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");

  const gptPromptHandler = new Function(stack, "GPTPromptHandler", {
    handler: "packages/functions/src/openAIStack.gptPromptHandler",
    bind: [OPEN_AI_KEY],
    timeout: "30 seconds",
  });

  const gptPromptSuccess = new Function(stack, "GPTPromptSuccess", {
    handler: "packages/functions/src/openAIStack.gptPromptSuccess",
  });

  // TODO: Catch the error
  const retryStateMachine = new StateMachine(stack, "GPTPromptRetry", {
    definitionBody: DefinitionBody.fromChainable(
      new LambdaInvoke(stack, "Invoke GPT Prompt Handler", {
        lambdaFunction: gptPromptHandler,
      })
        .addRetry({
          interval: Duration.seconds(60),
          backoffRate: 1.2,
          maxAttempts: 20,
        })
        .next(
          new LambdaInvoke(stack, "Invoke GPT Prompt Success Handler", {
            lambdaFunction: gptPromptSuccess,
          }).addRetry({
            interval: Duration.seconds(1),
            backoffRate: 2.0,
            maxAttempts: 20,
          })
        )
    ),
    timeout: Duration.minutes(32),
  });

  const dlq = new Queue(stack, "DlqOpenAIStack");

  const gptPromptQueue = new Queue(stack, "GPTPrompt", {
    consumer: {
      function: {
        handler: "packages/functions/src/openAIStack.gptPromptQueueConsumer",
        environment: {
          STATE_MACHINE: retryStateMachine.stateMachineArn,
        },
        permissions: ["states:StartExecution"],
      },
    },
    cdk: {
      queue: {
        deadLetterQueue: {
          maxReceiveCount: 5,
          queue: dlq.cdk.queue,
        },
      },
    },
  });

  // TODO: Add batch processing endpoint
  // TODO: Add prompt pipeline endpoint. Eg. User can send 3 prompts that will be chained based on the response of the previous
  // TODO: Create a third endpoint combining the previous 2
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
