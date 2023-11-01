import { z } from "zod";
import { event } from "../events/events";
import crypto from "crypto";

export enum EventNames {
  CreatedForSitemap = "url.createdForSitemap",
  CreatedForUrl = "url.createdForUrl",
}

export const Events = {
  CreatedForSitemap: event(EventNames.CreatedForSitemap, {
    id: z.string(),
    url: z.string(),
  }),
  CreatedForUrl: event(EventNames.CreatedForUrl, {
    id: z.string(),
    url: z.string(),
  }),
};

export async function createForSitemap(url: string) {
  const id = crypto.randomUUID();

  await Events.CreatedForSitemap.publish({
    id,
    url,
  });
}

export async function createForUrl(url: string) {
  const id = crypto.randomUUID();

  await Events.CreatedForUrl.publish({
    id,
    url,
  });
}
