import { z } from "zod";
import { event } from "../events/events";
import crypto from "crypto";

export enum EventNames {
  CreatedForTranslation = "translation.createdForTranslation",
}

export const Events = {
  CreatedForTranslation: event(EventNames.CreatedForTranslation, {
    id: z.string(),
    html: z.string(),
  }),
};

export async function createForTranslation(html: string) {
  const id = crypto.randomUUID();

  await Events.CreatedForTranslation.publish({
    id,
    html,
  });
}
