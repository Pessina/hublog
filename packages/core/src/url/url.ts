import { z } from "zod";
import { event } from "../events/events";
import crypto from "crypto";

export const Events = {
  Created: event("url.created", {
    id: z.string(),
    url: z.string(),
  }),
};

export async function create(url: string) {
  const id = crypto.randomUUID();

  await Events.Created.publish({
    id,
    url,
  });
}
