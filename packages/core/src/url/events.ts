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
    jobId: z.string().optional(),
  }),
  CreatedForUrl: event(EventNames.CreatedForUrl, {
    id: z.string(),
    url: z.string(),
    jobId: z.string().optional(),
  }),
};

export async function createForSitemap(url: string, jobId?: string) {
  const id = crypto.randomUUID();

  await Events.CreatedForSitemap.publish({
    id,
    url,
    jobId,
  });
}

export async function createForUrl(url: string, jobId?: string) {
  const id = crypto.randomUUID();

  await Events.CreatedForUrl.publish({
    id,
    url,
    jobId,
  });
}
