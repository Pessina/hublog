import { SSTConfig } from "sst";
import { ScrapingStack } from "./stacks/ScrapingStack";
import { OpenAIStack } from "./stacks/OpenAIStack";

export default {
  config(_input) {
    return {
      name: "hublog",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(ScrapingStack).stack(OpenAIStack);
  },
} satisfies SSTConfig;
