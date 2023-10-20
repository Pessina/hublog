import { ApiHandler } from "sst/node/api";
import { fetchPageContent } from "@hublog/core/src/scraping";
import { ChatGptService, contentPrompts } from "@hublog/core/src/gpt";

export const handler = ApiHandler(async (evt) => {
  const url = JSON.parse(evt.body ?? "").url;
  const GPTInstance = new ChatGptService(
    "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"
  );

  const content = await fetchPageContent(url);
  const res = await GPTInstance.runGPTPipeline(
    contentPrompts.extractMainContentAsHTML(content)
  );

  return {
    statusCode: 200,
    body: `Main content of the page: ${res}`,
  };
});
