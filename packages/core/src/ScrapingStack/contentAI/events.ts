import { z } from "zod";
import { event } from "../events/events";

export enum EventNames {
  CreatedForTranslation = "contentAI.createdForTranslation",
}

export const Events = {
  CreatedForTranslation: event(EventNames.CreatedForTranslation, {
    url: z.string(),
    language: z.string(),
    email: z.string(),
    password: z.string(),
    blogURL: z.string(),
  }),
};
