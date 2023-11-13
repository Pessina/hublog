import { event } from "../events/events";
import { z } from "zod";

export enum EventNames {
  Created = "scrap.created",
}

export type Scrap = {
  scrap: string;
};

export const Events = {
  Created: event(EventNames.Created, {
    scrap: z.string(),
    jobId: z.string().optional(),
  }),
};
