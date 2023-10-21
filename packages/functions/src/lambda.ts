import { ApiHandler } from "sst/node/api";
import { cleanHTML, fetchPageContent } from "@hublog/core/src/scraping";
import { translateHTML } from "@hublog/core/src/translation";
import { EventHandler } from "sst/node/event-bus";
import * as Todo from "@hublog/core/src/translation";

export const scrapingHandler = ApiHandler(async (evt) => {
  const url = JSON.parse(evt.body ?? "").url;

  const rawContent = await fetchPageContent(url);
  const cleanContent = cleanHTML(rawContent);

  await Todo.create(cleanContent);

  return {
    statusCode: 200,
  };
});

export const translationHandler = EventHandler(
  Todo.Events.Created,
  async (evt) => {
    const html = evt.properties.html;
    const translatedHTML = await translateHTML(html);
    console.log({ translatedHTML });
  }
);
