import { event } from "../events/events";
import { z } from "zod";

export enum EventNames {
  Upload = "image.upload",
}

export type ImageUploadConfig = {
  isPublic?: boolean;
};

export const Events = {
  Upload: event(EventNames.Upload, {
    src: z.string(),
    name: z.string(),
    jobId: z.string().optional(),
  }),
};
