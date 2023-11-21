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
  ProcessingJobs,
} from "@hublog/core/src/ScrapingStack/db";
import { TranslationJobsQueue } from "@hublog/core/src/ScrapingStack/queue";
import { Duration } from "aws-cdk-lib";
import { OpenAIStack } from "./OpenAIStack";

export function ScrapingStack({ stack }: StackContext) {
  const { ApiEndpoint: openAIServiceURL } = use(OpenAIStack);

  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 0,
    },
  });

  const scrapsTable = new Table(stack, "Scraps", {
    fields: {
      source: "string",
      html: "string",
      createdAt: "string",
      updatedAt: "string",
    },
    primaryIndex: { partitionKey: "source" },
  });

  // Update it to handle save all translation jobs info, language, targetBlog, etc
  // Set a consumer to the Jobs Translation Queue, that will read a job and add a entry on this DB with all the metadata
  const processingJobsTable = new Table(stack, "ProcessingJobs", {
    fields: {
      groupId: "string",
      partIndex: "number",
      totalParts: "number",
      status: "string",
      content: "string",
    },
    primaryIndex: { partitionKey: "groupId", sortKey: "partIndex" },
  });

  const translatedArticlesTable = new Table(stack, "TranslatedArticles", {
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
  });

  const dlq = new Queue(stack, "DlqScrapingStack");

  const translationJobsQueue = new Queue(
    stack,
    TranslationJobsQueue.TRANSLATION_JOBS_QUEUE_NAME,
    {
      cdk: {
        queue: {
          deliveryDelay: Duration.seconds(10),
          visibilityTimeout: Duration.seconds(5),
          deadLetterQueue: {
            queue: dlq.cdk.queue,
            maxReceiveCount: 5,
          },
        },
      },
    }
  );

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
    },
  });

  api.addRoutes(stack, {
    "POST /gpt-open-ai-service-handler": {
      function: {
        bind: [processingJobsTable, api],
        handler: "packages/functions/src/scrapingStack.GPTOpenAIServiceHandler",
        environment: {
          OPEN_AI_SERVICE_URL: openAIServiceURL,
        },
      },
    },
  });

  translationJobsQueue.addConsumer(stack, {
    function: {
      handler: "packages/functions/src/scrapingStack.translationHandler",
      bind: [scrapsTable, bus, api],
      environment: {
        OPEN_AI_SERVICE_URL: openAIServiceURL,
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
    bind: [translatedArticlesTable, scrapsTable, translationJobsQueue],
  });

  bus.subscribe(ContentAIEventNames.CreatedForTranslation, {
    bind: [imageBucket, translatedArticlesTable],
    handler: "packages/functions/src/scrapingStack.postWordPressHandler",
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
