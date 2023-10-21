import { StackContext, Api, Function, Config } from "sst/constructs";

export function ScrapingStack({ stack }: StackContext) {
  const scrapingFunction = new Function(stack, "ScrapingFunction", {
    handler: "packages/functions/src/scraping.handler",
    timeout: 15,
  });

  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [scrapingFunction, OPEN_AI_KEY],
      },
    },
    routes: {
      "POST /scrape": "packages/functions/src/scraping.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
