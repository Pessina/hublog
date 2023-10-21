import { StackContext, Api, Function, Config } from "sst/constructs";

export function ScrapingStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");

  const scrapingFunction = new Function(stack, "ScrapingFunction", {
    handler: "packages/functions/src/lambda.scrapingHandler",
    timeout: 15,
  });

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [scrapingFunction, OPEN_AI_KEY],
      },
    },
    routes: {
      "POST /scrape": "packages/functions/src/lambda.scrapingHandler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
