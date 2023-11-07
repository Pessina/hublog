import { ApiHandler } from "sst/node/api";
import crypto from "crypto";

import {
  TranslationUtils,
  TranslationEvents,
} from "@hublog/core/src/translation";
import { EventHandler } from "sst/node/event-bus";
import { UrlUtils, UrlEvents } from "@hublog/core/src/url";
import { ImageUtils, ImagesEvents } from "@hublog/core/src/images";
import { ScrapUtils, ScrapEvents } from "@hublog/core/src/scraping";
import { WordPress } from "@hublog/core/src/wordpress";
import { TranslationJobsDB } from "@hublog/core/src/db";
import { ImagesBucket } from "@hublog/core/src/s3";

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
    await UrlUtils.createEventsForUrls(urls.slice(0, 3), jobId);
  }
);

export const scrapingHandler = EventHandler(
  UrlEvents.CreatedForUrl,
  async (evt) => {
    const { url, jobId = "" } = evt.properties;
    const rawHTML = await ScrapUtils.fetchPageContent(url);
    const { noImagesHTML, images } =
      await ScrapUtils.replaceImagesWithPlaceholders(rawHTML);
    const cleanHTML = ScrapUtils.cleanHTML(noImagesHTML);
    await ScrapUtils.createEventForScrap(cleanHTML, jobId);
  }
);

export const imageUploadHandler = EventHandler(
  ImagesEvents.Upload,
  async (evt) => {
    const { urlHash, imgSrc } = evt.properties;
    const imageBuffer = await ImageUtils.processImageSrc(imgSrc);
    await ImagesBucket.uploadImage(imageBuffer, urlHash);
  }
);

export const translationHandler = EventHandler(
  ScrapEvents.Created,
  async (evt) => {
    const { scrap, jobId } = evt.properties;
    TranslationJobsDB.updateJobReferenceCount(jobId ?? "", "add", 1);
    const job = await TranslationJobsDB.getJob(jobId ?? "");
    const translatedHTML = await TranslationUtils.translateHTML(
      scrap,
      job.language
    );
    await TranslationUtils.createEventForTranslation(translatedHTML, jobId);
  }
);

// TODO: GPT SEO handler (title, meta description, ...)

export const postWordPressHandler = EventHandler(
  TranslationEvents.CreatedForTranslation,
  async (evt) => {
    const { html, jobId } = evt.properties;
    const job = await TranslationJobsDB.getJob(jobId ?? "");

    const wordPress = new WordPress(job.email, job.password, job.targetBlogURL);

    // TODO: GPT WordPress handler (slug, tags...)

    await wordPress.setPost({
      title: Date.now().toString(),
      content: html,
      status: "publish",
    });
  }
);

export const deleteOldTranslationJobs = async () => {
  const jobs = await TranslationJobsDB.getJobs(
    (job) =>
      Date.now() - new Date(job.lastAccessedAt).getTime() > 24 * 60 * 60 * 1000
  );
  jobs.forEach((job) => TranslationJobsDB.deleteJob(job.jobId));
};
