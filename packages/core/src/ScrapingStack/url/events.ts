import { z } from "zod";
import { event } from "../events/events";
import { destinationBlogsSchema } from "../api/validation";

export enum EventNames {
  CreatedForSitemap = "url.createdForSitemap",
  CreatedForUrl = "url.createdForUrl",
}

export const Events = {
  CreatedForSitemap: event(EventNames.CreatedForSitemap, {
    url: z.string(),
    destinations: destinationBlogsSchema,
  }),
  CreatedForUrl: event(EventNames.CreatedForUrl, {
    url: z.string(),
  }),
};
