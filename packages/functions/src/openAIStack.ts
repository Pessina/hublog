import { ApiHandler } from "sst/node/api";
import core from "@hublog/core/src/OpenAIStack";
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
  const exponentialRetry = new core.DB.APIRetryDB();
  const openAI = new OpenAI({ apiKey: Config.OPEN_AI_KEY });

  const message = core.Validation.validate(
    evt.Records[0],
    core.Queue.GPTPrompt.gptPromptQueueMessageSchema
  );
  const data = JSON.parse(message.body);

  try {
    const res = await openAI.chat.completions.create({
      model: data.model,
      messages: data.messages,
    });

    console.log(res);

    exponentialRetry.resetRetryCount(data.model);
  } catch (error: any) {
    const item = await exponentialRetry.get(data.model);
    if (item && item.retryCount >= 5) {
      core.Queue.GPTPrompt.remove(message.receiptHandle);
    }
    exponentialRetry.incrementRetryCount(data.model);

    throw new Error(
      `Failed to create chat completions with OpenAI: ${error.message}`
    );
  }
};
