import { ApiHandler } from "sst/node/api";
import core from "@hublog/core/src/OpenAIStack";

export const gptAPIHandler = ApiHandler(async (evt) => {
  try {
    const req = core.API.validateChatGptRequest(JSON.parse(evt.body ?? ""));
    core.Queue.GPTPromptQueue.emit(req);

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

export const gptQueueConsumer = async () => {};
