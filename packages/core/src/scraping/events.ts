import { event } from "../events/events";
import { z } from "zod";
import crypto from "crypto";

export enum EventNames {
  Created = "scrap.created",
}

export const Events = {
  Created: event(EventNames.Created, {
    id: z.string(),
    scrap: z.string(),
    jobId: z.string().optional(),
  }),
};

export async function createForScrap(scrap: string, jobId?: string) {
  const id = crypto.randomUUID();

  await Events.Created.publish({
    id,
    scrap,
    jobId,
  });
}
