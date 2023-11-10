import { z } from "zod";
import { event } from "../events/events";

export enum EventNames {
  CreatedForTranslation = "contentAI.createdForTranslation",
}

export const Events = {
  CreatedForTranslation: event(EventNames.CreatedForTranslation, {
    title: z.string(),
    metaDescription: z.string(),
    html: z.string(),
    jobId: z.string().optional(),
  }),
};
