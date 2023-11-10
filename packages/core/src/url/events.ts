import { z } from "zod";
import { event } from "../events/events";

export enum EventNames {
  CreatedForSitemap = "url.createdForSitemap",
  CreatedForUrl = "url.createdForUrl",
}

export const Events = {
  CreatedForSitemap: event(EventNames.CreatedForSitemap, {
    url: z.string(),
    jobId: z.string().optional(),
  }),
  CreatedForUrl: event(EventNames.CreatedForUrl, {
    url: z.string(),
    jobId: z.string().optional(),
  }),
};
