// @ts-nocheck
import { StackContext, Api, Function } from "sst/constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export function ScrapingStack({ stack }: StackContext) {
  const layerChromium = new lambda.LayerVersion(stack, "chromiumLayers", {
    code: lambda.Code.fromAsset("layers/chromium"),
  });

  const scrapingFunction = new Function(stack, "ScrapingFunction", {
    handler: "packages/functions/src/scraping.handler",
    runtime: "nodejs18.x",
    timeout: 15,
    layers: [layerChromium],
    nodejs: {
      esbuild: {
        external: ["@sparticuz/chromium"],
      },
    },
  });

  const api = new Api(stack, "api", {
    defaults: {
      function: {
        bind: [scrapingFunction],
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
