import { SSTConfig } from "sst";
import { ScrapingStack } from "./stacks/ScrapingStack";

export default {
  config(_input) {
    return {
      name: "hublog",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(ScrapingStack);
  },
} satisfies SSTConfig;
