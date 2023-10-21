import { ApiHandler } from "sst/node/api";
import { cleanHTML, fetchPageContent } from "@hublog/core/src/scraping";
import { ChatGptService, contentPrompts } from "@hublog/core/src/gpt";
import { Config } from "sst/node/config";

export const scrapingHandler = ApiHandler(async (evt) => {
  const url = JSON.parse(evt.body ?? "").url;
  const rawContent = await fetchPageContent(url);
  const cleanContent = cleanHTML(rawContent);
  return {
    statusCode: 200,
    body: cleanContent,
  };
});

// export const translationHandler = ApiHandler(async (evt) => {
//   const GPTInstance = new ChatGptService(Config.OPEN_AI_KEY);

//   const res = await GPTInstance.runGPTPipeline(
//     contentPrompts.extractMainContentAsHTML("")
//   );
//   return {
//     statusCode: 200,
//     body: res.messages[0],
//   };
// });
