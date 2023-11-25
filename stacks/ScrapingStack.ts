import {
  StackContext,
  Api,
  EventBus,
  Bucket,
  Table,
  use,
  Function,
  Queue,
} from "sst/constructs";
import { UrlEventNames } from "@hublog/core/src/ScrapingStack/url";
import { ContentAIEventNames } from "@hublog/core/src/ScrapingStack/contentAI";
import { ImagesEventNames } from "@hublog/core/src/ScrapingStack/images";
import { ImagesBucket } from "@hublog/core/src/ScrapingStack/s3";
import { Duration } from "aws-cdk-lib";
import { OpenAIStack } from "./OpenAIStack";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";

export function ScrapingStack({ stack }: StackContext) {
  const { ApiEndpoint: openAIServiceURL } = use(OpenAIStack);

  const bus = new EventBus(stack, "bus", {
    defaults: {
      retries: 0,
    },
  });

  const scrapsTable = new Table(stack, "ScrapsTable", {
    fields: {
      source: "string",
      html: "string",
      createdAt: "string",
      updatedAt: "string",
    },
    primaryIndex: { partitionKey: "source" },
  });

  const translationJobsTable = new Table(stack, "TranslationJobsTable", {
    fields: {
      id: "string",
      blogURL: "string",
      language: "string",
      email: "string",
      password: "string",
      originURL: "string",
    },
    primaryIndex: { partitionKey: "id" },
    stream: true,
  });

  // Update it to handle save all translation jobs info, language, targetBlog, etc
  // Set a consumer to the Jobs Translation Queue, that will read a job and add a entry on this DB with all the metadata
  const processingJobsTable = new Table(stack, "ProcessingJobsTable", {
    fields: {
      groupId: "string",
      partIndex: "number",
      totalParts: "number",
      status: "string",
      content: "string",
    },
    primaryIndex: { partitionKey: "groupId", sortKey: "partIndex" },
    stream: true,
  });

  const translatedArticlesTable = new Table(stack, "TranslatedArticlesTable", {
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
          bind: [bus, translationJobsTable],
        },
      },
    },
  });

  const dlq = new Queue(stack, "DlqScrapingStack");

  const translationJobsQueue = new Queue(stack, "TranslationJobsQueue", {
    consumer: {
      function: {
        handler:
          "packages/functions/src/scrapingStack.translationJobQueueConsumer",
        bind: [
          translationJobsTable,
          scrapsTable,
          bus,
          api,
          processingJobsTable,
        ],
        environment: {
          OPEN_AI_SERVICE_URL: openAIServiceURL,
        },
      },
    },
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(60),
        deliveryDelay: Duration.seconds(10),
        deadLetterQueue: {
          maxReceiveCount: 2,
          queue: dlq.cdk.queue,
        },
      },
    },
  });

  const translationJobTableConsumer = new Function(
    stack,
    "TranslationJobTableConsumer",
    {
      handler:
        "packages/functions/src/scrapingStack.translationJobTableConsumer",
      bind: [translationJobsTable, translationJobsQueue],
    }
  );

  translationJobsTable.addConsumers(stack, {
    translationJobTableConsumer: translationJobTableConsumer,
  });

  processingJobsTable.addConsumers(stack, {
    processingJobsTableConsumer: {
      function: {
        handler:
          "packages/functions/src/scrapingStack.processingJobsTableConsumer",
        bind: [
          translationJobsTable,
          api,
          translatedArticlesTable,
          processingJobsTable,
        ],
        environment: {
          OPEN_AI_SERVICE_URL: openAIServiceURL,
        },
      },
      cdk: {
        eventSource: {
          startingPosition: StartingPosition.TRIM_HORIZON,
          batchSize: 1,
          retryAttempts: 5,
        },
      },
    },
  });

  api.addRoutes(stack, {
    "POST /gpt-open-ai-service-handler": {
      function: {
        bind: [processingJobsTable],
        handler: "packages/functions/src/scrapingStack.GPTOpenAIServiceHandler",
      },
    },
  });

  bus.subscribe(UrlEventNames.CreatedForSitemap, {
    handler: "packages/functions/src/scrapingStack.sitemapHandler",
    bind: [bus, translationJobsTable],
  });

  bus.subscribe(UrlEventNames.CreatedForUrl, {
    handler: "packages/functions/src/scrapingStack.scrapingHandler",
    bind: [bus, scrapsTable],
  });

  bus.subscribe(ImagesEventNames.Upload, {
    handler: "packages/functions/src/scrapingStack.imageUploadHandler",
    bind: [bus, imageBucket],
  });

  bus.subscribe(ContentAIEventNames.CreatedForTranslation, {
    bind: [imageBucket, translatedArticlesTable],
    handler: "packages/functions/src/scrapingStack.postWordPressHandler",
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
