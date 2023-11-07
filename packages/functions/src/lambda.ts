import { ApiHandler } from "sst/node/api";
import crypto from "crypto";

import {
  TranslationUtils,
  TranslationEvents,
} from "@hublog/core/src/translation";
import { EventHandler } from "sst/node/event-bus";
import { UrlUtils, UrlEvents } from "@hublog/core/src/url";
import { ScrapUtils, ScrapEvents } from "@hublog/core/src/scraping";
import { WordPress } from "@hublog/core/src/wordpress";
import { TranslationJobsDB } from "@hublog/core/src/db";

export const sitemapUrlHandler = ApiHandler(async (evt) => {
  const { url, job } = JSON.parse(evt.body ?? "");
  try {
    const jobId = crypto.randomUUID();
    await UrlUtils.createEventForSitemap(url, jobId);
    await TranslationJobsDB.createJob(
      TranslationJobsDB.validateJob({ ...job, jobId })
    );

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
  const { urls, job } = JSON.parse(evt.body ?? "");
  try {
    const jobId = crypto.randomUUID();
    await UrlUtils.createEventsForUrls(urls, jobId);
    await TranslationJobsDB.createJob(
      TranslationJobsDB.validateJob({ ...job, jobId })
    );

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
    const { url, jobId = "" } = evt.properties;
    const urls = await UrlUtils.getSitemapUrlsFromDomain(url);
    // TODO: remove slice
    await UrlUtils.createEventsForUrls(urls.slice(0, 1), jobId);
  }
);

export const scrapingHandler = EventHandler(
  UrlEvents.CreatedForUrl,
  async (evt) => {
    const { url, jobId = "" } = evt.properties;
    const rawHTML = await ScrapUtils.fetchPageContent(url);
    const cleanHTML = ScrapUtils.cleanHTML(rawHTML);
    await ScrapUtils.createEventForScrap(cleanHTML, jobId);
  }
);

export const translationHandler = EventHandler(
  ScrapEvents.Created,
  async (evt) => {
    const { scrap, jobId } = evt.properties;
    const job = await TranslationJobsDB.getJob(jobId ?? "");
    const translatedHTML = await TranslationUtils.translateHTML(
      scrap,
      job.language
    );
    await TranslationUtils.createEventForTranslation(translatedHTML, jobId);
  }
);

export const postWordPressHandler = EventHandler(
  TranslationEvents.CreatedForTranslation,
  async (evt) => {
    const { html, jobId } = evt.properties;
    const job = await TranslationJobsDB.getJob(jobId ?? "");

    const wordPress = new WordPress(job.email, job.password, job.targetBlogURL);

    await wordPress.setPost({
      title: Date.now().toString(),
      content: html,
      status: "publish",
    });
  }
);
