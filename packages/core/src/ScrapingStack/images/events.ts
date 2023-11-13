import { z } from "zod";
import { event } from "../events/events";

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
  }),
};
