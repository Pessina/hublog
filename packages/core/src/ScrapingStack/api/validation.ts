import { z } from "zod";
import Utils from "../../utils";

interface SitemapTranslationJob {
  id: string;
  sitemap: string;
  destinationBlogs: DestinationBlog[];
}

interface ULRListTranslationJob {
  id: string;
  urlList: string[];
  destinationBlogs: DestinationBlog[];
}

export interface DestinationBlog {
  blogURL: string;
  language: string;
  /*
    TODO: Validate if credential are valid for the destination blog before proceed
    It can lead to high OpenAI costs if the target blog is not valid
  */
  email: string;
  password: string;
}

export const destinationBlogsSchema = z.array(
  z.object({
    blogURL: z.string().url(),
    language: z.string(),
    email: z.string().email(),
    password: z.string(),
  })
);

export const validateSitemapInput = (translationJob: SitemapTranslationJob) => {
  const translationJobSchema = z.object({
    id: z.string(),
    sitemap: z.string().url(),
    destinationBlogs: destinationBlogsSchema,
  });
  return Utils.zodValidate(translationJob, translationJobSchema);
};

export const validateURLListInput = (translationJob: ULRListTranslationJob) => {
  const translationJobSchema = z.object({
    id: z.string(),
    urlList: z.array(z.string().url()),
    destinationBlogs: destinationBlogsSchema,
  });
  return Utils.zodValidate(translationJob, translationJobSchema);
};
