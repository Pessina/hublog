import {
  StackContext,
  Api,
  EventBus,
  Bucket,
  Table,
  use,
  Queue,
} from "sst/constructs";
import { UrlEventNames } from "@hublog/core/src/ScrapingStack/url";
import { ContentAIEventNames } from "@hublog/core/src/ScrapingStack/contentAI";
import { ImagesEventNames } from "@hublog/core/src/ScrapingStack/images";
import { ImagesBucket } from "@hublog/core/src/ScrapingStack/s3";
import { OpenAIStack } from "./OpenAIStack";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";

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

  const translationMetadataTable = new Table(
    stack,
    "TranslationMetadataTable",
    {
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
    }
  );

  const processingTranslationTable = new Table(
    stack,
    "ProcessingTranslationTable",
    {
      fields: {
        groupId: "string",
        partIndex: "number",
        totalParts: "number",
        status: "string",
        content: "string",
      },
      primaryIndex: { partitionKey: "groupId", sortKey: "partIndex" },
      stream: true,
    }
  );

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
          bind: [bus, translationMetadataTable],
        },
      },
    },
  });

  const dlq = new Queue(stack, "DlqScrapingStack", {
    cdk: {
      queue: {
        fifo: true,
      },
    },
  });

  const translationMetadataQueue = new Queue(
    stack,
    "TranslationMetadataQueue",
    {
      consumer: {
        function: {
          handler:
            "packages/functions/src/scrapingStack.translationMetadataQueueConsumer",
          bind: [
            scrapsTable,
            processingTranslationTable,
            translationMetadataTable,
          ],
        },
      },
      cdk: {
        queue: {
          visibilityTimeout: Duration.seconds(60),
          deliveryDelay: Duration.seconds(10),
          fifo: true,
          contentBasedDeduplication: true,
          deadLetterQueue: {
            maxReceiveCount: 5,
            queue: dlq.cdk.queue,
          },
        },
      },
    }
  );

  translationMetadataTable.addConsumers(stack, {
    translationMetadataTableConsumer: {
      function: {
        handler:
          "packages/functions/src/scrapingStack.translationMetadataTableConsumer",
        bind: [translationMetadataQueue],
      },
      cdk: {
        eventSource: {
          startingPosition: StartingPosition.TRIM_HORIZON,
          batchSize: 1,
          parallelizationFactor: 3,
        },
      },
    },
  });

  processingTranslationTable.addConsumers(stack, {
    processingTranslationTableConsumer: {
      function: {
        handler:
          "packages/functions/src/scrapingStack.processingTranslationTableConsumer",
        bind: [
          api,
          translationMetadataTable,
          translatedArticlesTable,
          processingTranslationTable,
        ],
        environment: {
          OPEN_AI_SERVICE_URL: openAIServiceURL,
        },
      },
      cdk: {
        eventSource: {
          startingPosition: StartingPosition.TRIM_HORIZON,
          batchSize: 1,
        },
      },
    },
  });

  api.addRoutes(stack, {
    "POST /processing-translation-api-handler": {
      function: {
        bind: [processingTranslationTable],
        handler:
          "packages/functions/src/scrapingStack.processingTranslationAPIHandler",
      },
    },
  });

  bus.subscribe(UrlEventNames.CreatedForSitemap, {
    handler: "packages/functions/src/scrapingStack.sitemapHandler",
    bind: [bus, translationMetadataTable],
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
