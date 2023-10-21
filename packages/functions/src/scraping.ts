import { ApiHandler } from "sst/node/api";
import { fetchPageContent } from "@hublog/core/src/scraping";

export const handler = ApiHandler(async (evt) => {
  const url = JSON.parse(evt.body ?? "").url;
  const content = await fetchPageContent(url);
  return {
    statusCode: 200,
    body: content,
  };
});
