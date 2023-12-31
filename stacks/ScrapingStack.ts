import {
  StackContext,
  Api,
  EventBus,
  Bucket,
  Table,
  Queue,
  Config,
  Function,
} from "sst/constructs";
import { UrlEventNames } from "@hublog/core/src/ScrapingStack/url";
import { ImagesEventNames } from "@hublog/core/src/ScrapingStack/images";
import { ImagesBucket } from "@hublog/core/src/ScrapingStack/s3";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { DefinitionBody, StateMachine } from "aws-cdk-lib/aws-stepfunctions";

export function ScrapingStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");

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

  const failingTranslationTable = new Table(stack, "FailingTranslationTable", {
    fields: {
      originURL: "string",
      language: "string",
      reason: "string",
      createdAt: "string",
      updatedAt: "string",
    },
    primaryIndex: { partitionKey: "originURL", sortKey: "language" },
  });

  const translationMetadataTable = new Table(
    stack,
    "TranslationMetadataTable",
    {
      fields: {
        // TODO: The ID can be the blog URL + language + originURL
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
        retries: "number",
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
    stream: true,
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

  // Batch size 1 and FIFO is important, because we wanna make sure we won't run in parallel and the order is preserved
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
            failingTranslationTable,
          ],
          timeout: "30 seconds",
        },
        cdk: {
          eventSource: {
            batchSize: 1,
          },
        },
      },
      cdk: {
        queue: {
          visibilityTimeout: Duration.seconds(30),
          deliveryDelay: Duration.seconds(60),
          fifo: true,
          contentBasedDeduplication: true,
          deadLetterQueue: {
            maxReceiveCount: 10,
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

  // Process the translation entries individually, so we avoid unnecessary batch retries using GPT, what's very expensive
  const translationStateMachine = new StateMachine(
    stack,
    "TranslationStateMachine",
    {
      definitionBody: DefinitionBody.fromChainable(
        new LambdaInvoke(stack, "Start translation", {
          lambdaFunction: new Function(stack, "TranslationHandler", {
            handler: "packages/functions/src/scrapingStack.translationHandler",
            bind: [
              translationMetadataTable,
              translatedArticlesTable,
              processingTranslationTable,
              OPEN_AI_KEY,
            ],
            timeout: "90 seconds",
            // reservedConcurrentExecutions: 10,
          }),
        })
          .addRetry({
            interval: Duration.seconds(5),
            backoffRate: 1.5,
            maxAttempts: 10,
          })
          .addCatch(
            new LambdaInvoke(stack, "Catch translation", {
              lambdaFunction: new Function(stack, "TranslationHandlerFail", {
                handler:
                  "packages/functions/src/scrapingStack.translationHandlerFail",
                bind: [processingTranslationTable, failingTranslationTable],
              }),
            }).addRetry({
              interval: Duration.seconds(3),
              backoffRate: 1.1,
              maxAttempts: 20,
            })
          )
      ),
      timeout: Duration.hours(1),
    }
  );

  processingTranslationTable.addConsumers(stack, {
    processingTranslationTableConsumer: {
      function: {
        handler:
          "packages/functions/src/scrapingStack.processingTranslationTableConsumer",
        environment: {
          STATE_MACHINE: translationStateMachine.stateMachineArn,
        },
        permissions: ["states:StartExecution"],
      },
      cdk: {
        eventSource: {
          startingPosition: StartingPosition.TRIM_HORIZON,
          batchSize: 10,
        },
      },
    },
  });

  translatedArticlesTable.addConsumers(stack, {
    translatedArticlesTableConsumer: {
      function: {
        handler:
          "packages/functions/src/scrapingStack.translatedArticlesTableConsumer",
        bind: [
          translatedArticlesTable,
          OPEN_AI_KEY,
          translationMetadataTable,
          imageBucket,
        ],
        timeout: "30 seconds",
      },
      cdk: {
        eventSource: {
          startingPosition: StartingPosition.TRIM_HORIZON,
          // The batch must be 1, because the function is not idempotent, it will post the same article multiple times
          batchSize: 1,
          bisectBatchOnError: true,
          parallelizationFactor: 10,
        },
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

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
