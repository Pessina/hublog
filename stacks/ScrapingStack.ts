import {
  StackContext,
  Api,
  Config,
  EventBus,
  Table,
  Cron,
  Bucket,
} from "sst/constructs";
import { UrlEventNames } from "@hublog/core/src/url";
import { ContentAIEventNames } from "@hublog/core/src/contentAI";
import { ImagesEventNames } from "@hublog/core/src/images";
import { ScrapEventNames } from "@hublog/core/src/scraping";
import { TranslationJobsDB } from "@hublog/core/src/db";
import { ImagesBucket } from "@hublog/core/src/s3";

export function ScrapingStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");

  const table = new Table(stack, TranslationJobsDB.TRANSLATION_JOBS_TABLE, {
    fields: {
      jobId: "string",
      language: "string",
      email: "string",
      password: "string",
      targetBlogURL: "string",
      createdAt: "string",
    },
    primaryIndex: { partitionKey: "jobId" },
  });

  const imageBucket = new Bucket(stack, ImagesBucket.IMAGES_BUCKET, {
    cors: [
      {
        allowedMethods: ["GET"],
        allowedOrigins: ["*"],
      },
    ],
  });

  // TODO: improve it by keeping a reference count to the job. If it's 0 it should be deleted
  new Cron(stack, "DeleteOldTranslationJobs", {
    schedule: "rate(1 day)",
    job: {
      function: {
        handler: "packages/functions/src/lambda.deleteOldTranslationJobs",
        bind: [table],
        timeout: "360 seconds",
      },
    },
  });

  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 0,
    },
  });

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [bus, table],
      },
    },
    routes: {
      "POST /scrap/sitemap": {
        function: {
          handler: "packages/functions/src/lambda.sitemapUrlHandler",
        },
      },
      "POST /scrap/url-list": {
        function: {
          handler: "packages/functions/src/lambda.urlListHandler",
        },
      },
    },
  });

  bus.subscribe(UrlEventNames.CreatedForSitemap, {
    handler: "packages/functions/src/lambda.sitemapHandler",
    bind: [bus],
  });

  bus.subscribe(UrlEventNames.CreatedForUrl, {
    handler: "packages/functions/src/lambda.scrapingHandler",
    bind: [bus, OPEN_AI_KEY],
    timeout: "2 minutes",
    permissions: ["ses:SendEmail"],
  });

  bus.subscribe(ImagesEventNames.Upload, {
    handler: "packages/functions/src/lambda.imageUploadHandler",
    bind: [bus, imageBucket],
  });

  bus.subscribe(ScrapEventNames.Created, {
    handler: "packages/functions/src/lambda.translationHandler",
    timeout: "60 seconds",
    bind: [bus, OPEN_AI_KEY, table],
  });

  bus.subscribe(ContentAIEventNames.CreatedForTranslation, {
    bind: [table, OPEN_AI_KEY, imageBucket],
    handler: "packages/functions/src/lambda.postWordPressHandler",
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
