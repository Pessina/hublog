import { z } from "zod";
import { event } from "../events/events";
import crypto from "crypto";

export enum EventNames {
  CreatedForTranslation = "translation.createdForTranslation",
}

export const Events = {
  CreatedForTranslation: event(EventNames.CreatedForTranslation, {
    id: z.string(),
    title: z.string(),
    metaDescription: z.string(),
    html: z.string(),
    jobId: z.string().optional(),
  }),
};

export async function createForTranslation(
  title: string,
  metaDescription: string,
  html: string,
  jobId?: string
) {
  const id = crypto.randomUUID();

  await Events.CreatedForTranslation.publish({
    id,
    title,
    metaDescription,
    html,
    jobId,
  });
}
