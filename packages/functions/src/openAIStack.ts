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

    await core.Queue.GPTPrompt.emit(req);

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

// TODO: Interrupt consumer if Open API it's failing too much.
export const gptPromptQueueConsumer = async (evt: SQSEvent) => {
  const message = Utils.zodValidate(
    evt.Records[0],
    core.Queue.GPTPrompt.gptPromptQueueMessageSchema
  );

  await Utils.StateMachine.startStateMachine(
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
  } catch (e: any) {
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
  const res = Utils.zodValidate(
    evt.Payload,
    core.API.schemas.gptHandlerSuccessResponseSchema
  );

  const response = await fetch(res.callbackURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(res.response),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch from callback. HTTP status: ${
        response.status
      }. body: ${JSON.stringify(res.response)}`
    );
  }
};
