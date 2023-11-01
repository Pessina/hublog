import { StackContext, Api, Config, EventBus } from "sst/constructs";
import { UrlEventNames } from "@hublog/core/src/url";
import { TranslationEventNames } from "@hublog/core/src/translation";
import { ScrapEventNames } from "@hublog/core/src/scraping";

export function ScrapingStack({ stack }: StackContext) {
  const OPEN_AI_KEY = new Config.Secret(stack, "OPEN_AI_KEY");
  const WORDPRESS_API_KEY = new Config.Secret(stack, "WORDPRESS_API_KEY");
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
      "POST /scrap/url-list": {
        function: {
          handler: "packages/functions/src/lambda.urlListHandler",
        },
      },
    },
  });

  bus.subscribe(UrlEventNames.CreatedForSitemap, {
    handler: "packages/functions/src/lambda.sitemapHandler",
    bind: [bus],
  });

  bus.subscribe(UrlEventNames.CreatedForUrl, {
    handler: "packages/functions/src/lambda.scrapingHandler",
    bind: [bus],
  });

  bus.subscribe(ScrapEventNames.Created, {
    handler: "packages/functions/src/lambda.translationHandler",
    timeout: "60 seconds",
    bind: [OPEN_AI_KEY, bus],
  });

  bus.subscribe(TranslationEventNames.CreatedForTranslation, {
    bind: [WORDPRESS_API_KEY],
    handler: "packages/functions/src/lambda.postWordPressHandler",
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
