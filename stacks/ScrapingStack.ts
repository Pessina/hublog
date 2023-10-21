import { StackContext, Api, Function, Config, EventBus } from "sst/constructs";

export function ScrapingStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");
  const bus = new EventBus(stack, "bus");

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [bus],
      },
    },
    routes: {
      "POST /scrape": {
        function: {
          handler: "packages/functions/src/lambda.scrapingHandler",
        },
      },
    },
  });

  bus.subscribe("todo.created", {
    bind: [OPEN_AI_KEY],
    handler: "packages/functions/src/lambda.translationHandler",
    timeout: "60 seconds",
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
