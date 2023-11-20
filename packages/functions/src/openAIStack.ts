import { ApiHandler } from "sst/node/api";
import core from "@hublog/core/src/OpenAIStack";
import Utils from "@hublog/core/src/utils";
import OpenAI from "openai";
import { Config } from "sst/node/config";
import { SQSEvent } from "aws-lambda";
import { Lambda } from "aws-sdk";

// TODO: Add model token limit validation here
export const gptAPIHandler = ApiHandler(async (evt) => {
  try {
    const req = Utils.zodValidate(
      JSON.parse(evt.body ?? ""),
      core.API.schemas.gptPromptRequestSchema
    );

    core.Queue.GPTPrompt.emit(req);

    return {
      statusCode: 200,
    };
  } catch (e: any) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `An error occurred while processing the GPT prompt request: ${e?.message}`,
      }),
    };
  }
});

// TODO: if the model it's failing too much interrupt the SQS consumer, check APIRetry table
export const gptPromptQueueConsumer = async (evt: SQSEvent) => {
  try {
    const message = Utils.zodValidate(
      evt.Records[0],
      core.Queue.GPTPrompt.gptPromptQueueMessageSchema
    );

    Utils.StateMachine.startStateMachine(
      process.env.STATE_MACHINE ?? "",
      message.body
    );
  } catch (e) {
    console.error(e);
  }
};

export const gptPromptHandler = async (evt: any) => {
  const message = Utils.zodValidate(
    evt,
    core.API.schemas.gptPromptRequestSchema
  );

  const openAI = new OpenAI({ apiKey: Config.OPEN_AI_KEY });

  try {
    const res = await openAI.chat.completions.create({
      model: message.prompt.model,
      messages: message.prompt.messages,
    });

    return {
      callbackURL: message.callbackURL,
      response: res,
    };
  } catch (e: any) {
    const exponentialRetry = new core.DB.APIRetryDB();
    await exponentialRetry.incrementRetryCount(message.prompt.model);

    console.error(e);

    // TODO: add logging to track errors
    switch (e.error.code) {
      case "context_length_exceeded":
        return {
          response: {
            errorCode: e.error.code,
            message: e.error.message,
          },
          callbackURL: message.callbackURL,
        };
      case "rate_limit_exceeded":
        const error = {
          response: {
            errorCode: e.error.code,
            message: e.error.message,
          },
          callbackURL: message.callbackURL,
        };
        throw new Error(JSON.stringify(error));
      default:
        throw new Error(e);
    }
  }
};

export const gptPromptSuccess = async (
  evt: Lambda.Types.InvocationResponse
) => {
  try {
    const res = Utils.zodValidate(
      evt.Payload,
      core.API.schemas.gptHandlerSuccessResponseSchema
    );

    const exponentialRetry = new core.DB.APIRetryDB();
    await exponentialRetry.resetRetryCount(res.response.model);

    await fetch(res.callbackURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(res.response),
    });
  } catch (e) {
    console.error(e);
    const res = Utils.zodValidate(
      evt.Payload,
      core.API.schemas.gptHandlerErrorResponseSchema
    );

    await fetch(res.callbackURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(res.response),
    });
  }
};

export const gptPromptFail = async (evt: any) => {
  const cause = JSON.parse(evt.Cause);
  const callbackURL = JSON.parse(cause.errorMessage).callbackURL;

  await fetch(callbackURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: "Error invoking GPT Prompt Handler",
      errorCode: 500,
    }),
  });
};
