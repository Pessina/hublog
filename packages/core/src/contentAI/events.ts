import { z } from "zod";
import { event } from "../events/events";

export enum EventNames {
  CreatedForTranslation = "contentAI.createdForTranslation",
}

export const Events = {
  CreatedForTranslation: event(EventNames.CreatedForTranslation, {
    html: z.string(),
    jobId: z.string().optional(),
  }),
};
