import { event } from "../events/events";
import { z } from "zod";

export enum EventNames {
  Created = "scrap.created",
}

export type Scrap = {
  title: string;
  metaDescription: string;
  scrap: string;
};

export const Events = {
  Created: event(EventNames.Created, {
    title: z.string(),
    metaDescription: z.string(),
    scrap: z.string(),
    jobId: z.string().optional(),
  }),
};
