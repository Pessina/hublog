import { event } from "../events/events";
import { z } from "zod";
import crypto from "crypto";

export enum EventNames {
  Upload = "image.upload",
}

export type ImageUploadConfig = {
  isPublic?: boolean;
};

export const Events = {
  Upload: event(EventNames.Upload, {
    id: z.string(),
    imgSrc: z.string(),
    urlHash: z.string(),
    jobId: z.string().optional(),
  }),
};

export async function createForImageUpload(
  imgSrc: string,
  urlHash: string,
  jobId?: string
) {
  const id = crypto.randomUUID();

  await Events.Upload.publish({
    id,
    imgSrc,
    urlHash,
    jobId,
  });
}
