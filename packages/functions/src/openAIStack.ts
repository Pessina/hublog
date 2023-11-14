import { ApiHandler } from "sst/node/api";
import core from "@hublog/core/src/OpenAIStack";
import Utils from "@hublog/core/src/utils";
import OpenAI from "openai";
import { Config } from "sst/node/config";
import { SQSEvent } from "aws-lambda";

export const gptAPIHandler = ApiHandler(async (evt) => {
  try {
    const req = core.Validation.validate(
      JSON.parse(evt.body ?? ""),
      core.Validation.chatGptRequestSchema
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

export const gptQueueConsumer = async (evt: SQSEvent) => {
  const message = core.Validation.validate(
    evt.Records[0],
    core.Queue.GPTPrompt.gptPromptQueueMessageSchema
  );

  Utils.StateMachine.startStateMachine(
    process.env.STATE_MACHINE ?? "",
    message.body
  );
};

export const gptPromptHandler = async (evt: any) => {
  const message = core.Validation.validate(
    evt,
    core.Validation.chatGptRequestSchema
  );

  const exponentialRetry = new core.DB.APIRetryDB();
  const openAI = new OpenAI({ apiKey: Config.OPEN_AI_KEY });

  try {
    const res = await openAI.chat.completions.create({
      model: message.model,
      messages: message.messages,
    });

    console.log(res);

    exponentialRetry.resetRetryCount(message.model);
  } catch (error: any) {
    exponentialRetry.incrementRetryCount(message.model);

    throw new Error(
      `Failed to create chat completions with OpenAI: ${error.message}`
    );
  }
};
