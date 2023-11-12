import {
  StackContext,
  Api,
  Config,
  EventBus,
  Bucket,
  Queue,
  Table,
  Cron,
} from "sst/constructs";
import { UrlEventNames } from "@hublog/core/src/url";
import { ContentAIEventNames } from "@hublog/core/src/contentAI";
import { ImagesEventNames } from "@hublog/core/src/images";
import { ScrapEventNames } from "@hublog/core/src/scraping";
import { ImagesBucket } from "@hublog/core/src/s3";
import { ScrapsDB, ArticleTranslationsDB } from "@hublog/core/src/db";
import { TranslationJobsQueue } from "@hublog/core/src/queue";
import { Duration } from "aws-cdk-lib";

export function ScrapingStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");

  const scrapsTable = new Table(stack, ScrapsDB.SCRAPS_DB_TABLE, {
    fields: {
      source: "string",
      html: "string",
      createdAt: "string",
      updatedAt: "string",
    },
    primaryIndex: { partitionKey: "source" },
  });

  const articleTranslationsTable = new Table(
    stack,
    ArticleTranslationsDB.ARTICLES_TRANSLATIONS_DB_TABLE,
    {
      fields: {
        source: "string",
        html: "string",
        language: "string",
        createdAt: "string",
        updatedAt: "string",
      },
      primaryIndex: { partitionKey: "source", sortKey: "language" },
    }
  );

  const dlq = new Queue(stack, "DeadLetterQueue");

  const translationJobsQueue = new Queue(
    stack,
    TranslationJobsQueue.TRANSLATION_JOBS_QUEUE_NAME,
    {
      cdk: {
        queue: {
          visibilityTimeout: Duration.minutes(1),
          deadLetterQueue: {
            queue: dlq.cdk.queue,
            maxReceiveCount: 2,
          },
        },
      },
    }
  );

  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 0,
    },
  });

  new Cron(stack, "TranslationCron", {
    schedule: "rate(2 minutes)",
    job: {
      function: {
        handler: "packages/functions/src/lambda.translationHandler",
        // Adjust based on OpenAI limits
        // Request quota
        // reservedConcurrentExecutions: 1,
        bind: [
          translationJobsQueue,
          scrapsTable,
          bus,
          articleTranslationsTable,
          OPEN_AI_KEY,
        ],
      },
    },
  });

  const imageBucket = new Bucket(stack, ImagesBucket.IMAGES_BUCKET, {
    cors: [
      {
        allowedMethods: ["GET"],
        allowedOrigins: ["*"],
      },
    ],
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
    bind: [bus, scrapsTable],
  });

  bus.subscribe(ImagesEventNames.Upload, {
    handler: "packages/functions/src/lambda.imageUploadHandler",
    bind: [bus, imageBucket],
  });

  bus.subscribe(ScrapEventNames.Created, {
    handler: "packages/functions/src/lambda.translationHandler",
    timeout: "120 seconds",
    bind: [
      OPEN_AI_KEY,
      articleTranslationsTable,
      scrapsTable,
      translationJobsQueue,
    ],
  });

  // bus.subscribe(ContentAIEventNames.CreatedForTranslation, {
  //   bind: [OPEN_AI_KEY, imageBucket],
  //   handler: "packages/functions/src/lambda.postWordPressHandler",
  // });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
