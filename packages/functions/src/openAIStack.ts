import { ApiHandler } from "sst/node/api";
import core from "@hublog/core/src/OpenAIStack";
import Utils from "@hublog/core/src/utils";
import OpenAI from "openai";
import { Config } from "sst/node/config";
import { SQSEvent } from "aws-lambda";
import { Lambda } from "aws-sdk";

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
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Error creating event for sitemap: ${error?.message}`,
      }),
    };
  }
});

export const gptPromptQueueConsumer = async (evt: SQSEvent) => {
  const message = Utils.zodValidate(
    evt.Records[0],
    core.Queue.GPTPrompt.gptPromptQueueMessageSchema
  );

  Utils.StateMachine.startStateMachine(
    process.env.STATE_MACHINE ?? "",
    message.body
  );
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
  } catch (error: any) {
    throw new Error(
      `Failed to create chat completions with OpenAI: ${error.message}`
    );
  }
};

export const gptPromptSuccess = async (
  evt: Lambda.Types.InvocationResponse
) => {
  const res = Utils.zodValidate(
    evt.Payload,
    core.API.schemas.gptPromptResponseSchema
  );
  const exponentialRetry = new core.DB.APIRetryDB();
  exponentialRetry.resetRetryCount(res.response.model);

  await fetch(res.callbackURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(res),
  });
};

export const gptPromptFail = async (evt: Lambda.Types.InvocationResponse) => {
  console.log(evt);
  // const exponentialRetry = new core.DB.APIRetryDB();
  // exponentialRetry.incrementRetryCount(message.model);
};
