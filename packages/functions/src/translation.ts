import { ApiHandler } from "sst/node/api";
import { ChatGptService, contentPrompts } from "@hublog/core/src/gpt";
import { Config } from "sst/node/config";

export const handler = ApiHandler(async (evt) => {
  const GPTInstance = new ChatGptService(Config.OPEN_AI_KEY);

  const res = await GPTInstance.runGPTPipeline(
    contentPrompts.extractMainContentAsHTML("")
  );
  return {
    statusCode: 200,
    body: res.messages[0],
  };
});
