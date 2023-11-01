import { ApiHandler } from "sst/node/api";

import {
  TranslationUtils,
  TranslationEvents,
} from "@hublog/core/src/translation";
import { EventHandler } from "sst/node/event-bus";
import { UrlUtils, UrlEvents } from "@hublog/core/src/url";
import { ScrapUtils, ScrapEvents } from "@hublog/core/src/scraping";
import { WordPress } from "@hublog/core/src/wordpress";
import { Config } from "sst/node/config";

export const sitemapUrlHandler = ApiHandler(async (evt) => {
  const { url } = JSON.parse(evt.body ?? "");
  try {
    await UrlUtils.createEventForSitemap(url);
    return {
      statusCode: 200,
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Error creating event for sitemap ${url}: ${error?.message}`,
      }),
    };
  }
});

export const urlListHandler = ApiHandler(async (evt) => {
  const { urls } = JSON.parse(evt.body ?? "");
  try {
    await UrlUtils.createEventsForUrls(urls);
    return {
      statusCode: 200,
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Error creating events for urls: ${error?.message}`,
      }),
    };
  }
});

export const sitemapHandler = EventHandler(
  UrlEvents.CreatedForSitemap,
  async (evt) => {
    const { url } = evt.properties;
    const urls = await UrlUtils.getSitemapUrlsFromDomain(url);
    await UrlUtils.createEventsForUrls(urls.slice(0, 5));
  }
);

export const scrapingHandler = EventHandler(
  UrlEvents.CreatedForUrl,
  async (evt) => {
    const { url } = evt.properties;
    const rawHTML = await ScrapUtils.fetchPageContent(url);
    const cleanHTML = ScrapUtils.cleanHTML(rawHTML);
    await ScrapUtils.createEventForScrap(cleanHTML);
  }
);

export const translationHandler = EventHandler(
  ScrapEvents.Created,
  async (evt) => {
    const { scrap } = evt.properties;
    const translatedHTML = await TranslationUtils.translateHTML(scrap);
    await TranslationUtils.createEventForTranslation(translatedHTML);
  }
);

export const postWordPressHandler = EventHandler(
  TranslationEvents.CreatedForTranslation,
  async (evt) => {
    const { html } = evt.properties;
    const wordpress = new WordPress(
      "fs.pessina@gmail.com",
      Config.WORDPRESS_API_KEY,
      "blogify.net"
    );

    await wordpress.setPost({
      title: Date.now().toString(),
      content: html,
      status: "publish",
    });
  }
);
