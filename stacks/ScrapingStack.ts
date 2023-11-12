import {
  StackContext,
  Api,
  Config,
  EventBus,
  Bucket,
  Queue,
  Table,
} from "sst/constructs";
import { UrlEventNames } from "@hublog/core/src/url";
import { ContentAIEventNames } from "@hublog/core/src/contentAI";
import { ImagesEventNames } from "@hublog/core/src/images";
import { ScrapEventNames } from "@hublog/core/src/scraping";
import { ImagesBucket } from "@hublog/core/src/s3";
import { ScrappedDB } from "@hublog/core/src/db";
import { TranslationJobsQueue } from "@hublog/core/src/queue";

export function ScrapingStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");

  // Will be renamed to Scrap DB to store all the previous scraps.
  const scrappedTable = new Table(stack, ScrappedDB.SCRAPPED_DB_TABLE, {
    fields: {
      source: "string",
      html: "string",
      createdAt: "string",
      updatedAt: "string",
    },
    primaryIndex: { partitionKey: "source" },
  });

  const translationJobsQueue = new Queue(
    stack,
    TranslationJobsQueue.TRANSLATION_JOBS_QUEUE_NAME
  );

  const imageBucket = new Bucket(stack, ImagesBucket.IMAGES_BUCKET, {
    cors: [
      {
        allowedMethods: ["GET"],
        allowedOrigins: ["*"],
      },
    ],
  });

  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 0,
    },
  });

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [bus],
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
          bind: [translationJobsQueue],
        },
      },
    },
  });

  bus.subscribe(UrlEventNames.CreatedForSitemap, {
    handler: "packages/functions/src/lambda.sitemapHandler",
    bind: [bus, translationJobsQueue],
  });

  bus.subscribe(UrlEventNames.CreatedForUrl, {
    handler: "packages/functions/src/lambda.scrapingHandler",
    bind: [bus, scrappedTable],
  });

  bus.subscribe(ImagesEventNames.Upload, {
    handler: "packages/functions/src/lambda.imageUploadHandler",
    bind: [bus, imageBucket],
  });

  // bus.subscribe(ScrapEventNames.Created, {
  //   handler: "packages/functions/src/lambda.translationHandler",
  //   timeout: "60 seconds",
  //   bind: [bus, OPEN_AI_KEY],
  // });

  // bus.subscribe(ContentAIEventNames.CreatedForTranslation, {
  //   bind: [OPEN_AI_KEY, imageBucket],
  //   handler: "packages/functions/src/lambda.postWordPressHandler",
  // });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
