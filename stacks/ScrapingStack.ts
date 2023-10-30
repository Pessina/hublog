import { StackContext, Api, Config, EventBus } from "sst/constructs";

export function ScrapingStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");
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
      "POST /scrap/url-single": {
        function: {
          handler: "packages/functions/src/lambda.singleUrlHandler",
        },
      },
      "POST /scrap/url-list": {
        function: {
          handler: "packages/functions/src/lambda.urlListHandler",
        },
      },
    },
  });

  bus.subscribe("url.created", {
    handler: "packages/functions/src/lambda.scrapingHandler",
    bind: [bus],
  });

  bus.subscribe("scrap.created", {
    bind: [OPEN_AI_KEY],
    handler: "packages/functions/src/lambda.translationHandler",
    timeout: "60 seconds",
  });

  bus.attachPermissions(["ses:SendEmail"]);

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
