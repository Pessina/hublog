import {
  StackContext,
  Api,
  EventBus,
  Bucket,
  Queue,
  Table,
  Cron,
  use,
} from "sst/constructs";
import { UrlEventNames } from "@hublog/core/src/ScrapingStack/url";
import { ContentAIEventNames } from "@hublog/core/src/ScrapingStack/contentAI";
import { ImagesEventNames } from "@hublog/core/src/ScrapingStack/images";
import { ScrapEventNames } from "@hublog/core/src/ScrapingStack/scraping";
import { ImagesBucket } from "@hublog/core/src/ScrapingStack/s3";
import {
  ScrapsDB,
  ArticleTranslationsDB,
} from "@hublog/core/src/ScrapingStack/db";
import { TranslationJobsQueue } from "@hublog/core/src/ScrapingStack/queue";
import { Duration } from "aws-cdk-lib";
import { OpenAIStack } from "./OpenAIStack";

export function ScrapingStack({ stack }: StackContext) {
  const { ApiEndpoint: openAIEndpointURL } = use(OpenAIStack);

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
        title: "string",
        metaDescription: "string",
        slug: "string",
        html: "string",
        language: "string",
        createdAt: "string",
        updatedAt: "string",
      },
      primaryIndex: { partitionKey: "source", sortKey: "language" },
    }
  );

  const dlq = new Queue(stack, "DlqScrapingStack");

  const translationJobsQueue = new Queue(
    stack,
    TranslationJobsQueue.TRANSLATION_JOBS_QUEUE_NAME,
    {
      cdk: {
        queue: {
          visibilityTimeout: Duration.minutes(5),
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
    schedule: "rate(30 minutes)",
    job: {
      function: {
        handler: "packages/functions/src/scrapingStack.translationHandler",
        // Adjust based on OpenAI limits
        // Request quota
        // reservedConcurrentExecutions: 1,
        bind: [
          translationJobsQueue,
          scrapsTable,
          bus,
          articleTranslationsTable,
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

  const api = new Api(stack, "ScrapingStackAPI", {
    defaults: {
      function: {
        bind: [bus],
      },
    },
    routes: {
      "POST /scrap/sitemap": {
        function: {
          handler: "packages/functions/src/scrapingStack.sitemapUrlHandler",
        },
      },
      "POST /scrap/url-list": {
        function: {
          handler: "packages/functions/src/scrapingStack.urlListHandler",
          bind: [translationJobsQueue],
        },
      },
      "POST /test": {
        function: {
          handler: "packages/functions/src/scrapingStack.testHandler",
        },
      },
    },
  });

  bus.subscribe(UrlEventNames.CreatedForSitemap, {
    handler: "packages/functions/src/scrapingStack.sitemapHandler",
    bind: [bus, translationJobsQueue],
  });

  bus.subscribe(UrlEventNames.CreatedForUrl, {
    handler: "packages/functions/src/scrapingStack.scrapingHandler",
    bind: [bus, scrapsTable],
  });

  bus.subscribe(ImagesEventNames.Upload, {
    handler: "packages/functions/src/scrapingStack.imageUploadHandler",
    bind: [bus, imageBucket],
  });

  bus.subscribe(ScrapEventNames.Created, {
    handler: "packages/functions/src/scrapingStack.translationHandler",
    timeout: "5 minutes",
    bind: [articleTranslationsTable, scrapsTable, translationJobsQueue],
  });

  bus.subscribe(ContentAIEventNames.CreatedForTranslation, {
    bind: [imageBucket, articleTranslationsTable],
    handler: "packages/functions/src/scrapingStack.postWordPressHandler",
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
