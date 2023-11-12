import { ApiHandler } from "sst/node/api";
import crypto from "crypto";

import { ContentAIUtils, ContentAIEvents } from "@hublog/core/src/contentAI";
import { EventHandler } from "sst/node/event-bus";
import { UrlUtils, UrlEvents } from "@hublog/core/src/url";
import { ImageUtils, ImagesEvents } from "@hublog/core/src/images";
import { ScrapUtils, ScrapEvents } from "@hublog/core/src/scraping";
import { WordPress } from "@hublog/core/src/wordpress";
import { ScrapsDB, ArticleTranslationsDB } from "@hublog/core/src/db";
import { ImagesBucket } from "@hublog/core/src/s3";
import { APIUtils } from "@hublog/core/src/api";
import { TranslationJobsQueue } from "@hublog/core/queue";

export const sitemapUrlHandler = ApiHandler(async (evt) => {
  try {
    const validJob = APIUtils.validateSitemapInput({
      ...JSON.parse(evt.body ?? ""),
      id: crypto.randomUUID(),
    });

    if (validJob) {
      await UrlEvents.CreatedForSitemap.publish({
        url: validJob.sitemap,
        destinations: validJob.destinationBlogs,
      });
    }

    return {
      statusCode: 200,
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Error creating event for sitemap: ${error?.message}`,
      }),
    };
  }
});

export const urlListHandler = ApiHandler(async (evt) => {
  try {
    const validJob = APIUtils.validateURLListInput({
      ...JSON.parse(evt.body ?? ""),
      id: crypto.randomUUID(),
    });

    if (validJob) {
      await UrlUtils.createEventsForUrls(
        validJob.urlList,
        validJob.destinationBlogs
      );

      return {
        statusCode: 200,
      };
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Error creating events for urls: ${error?.message}`,
      }),
    };
  }
});

export const sitemapHandler = EventHandler(
  UrlEvents.CreatedForSitemap,
  async (evt) => {
    const { url, destinations } = evt.properties;
    const urls = await UrlUtils.getSitemapUrlsFromDomain(url);
    // TODO: remove slice
    await UrlUtils.createEventsForUrls(urls.slice(0, 10), destinations);
  }
);

export const scrapingHandler = EventHandler(
  UrlEvents.CreatedForUrl,
  async (evt) => {
    try {
      const { url } = evt.properties;

      const rawHTML = await ScrapUtils.processURLContent(url);

      const { noImagesHTML, images } =
        await ScrapUtils.replaceImagesWithPlaceholders(rawHTML);

      await Promise.all(
        images.map((i) =>
          ImagesEvents.Upload.publish({ src: i.imgSrc, name: i.urlHash })
        )
      );

      await ScrapsDB.createOrUpdateScrap({
        source: url,
        html: noImagesHTML,
      });
    } catch (error: any) {
      console.error(`Error scraping ${evt.properties.url}: ${error}`);
    }
  }
);

export const imageUploadHandler = EventHandler(
  ImagesEvents.Upload,
  async (evt) => {
    const { name, src } = evt.properties;
    const imageBuffer = await ImageUtils.processImageSrc(src);
    await ImagesBucket.uploadImage(imageBuffer, name, { isPublic: true });
  }
);

export const translationHandler = async () => {
  let translationJobMessage = await TranslationJobsQueue.consumeMessage();
  if (!translationJobMessage)
    throw new Error(
      `translationHandler: No message found in the queue to process`
    );

  let { data: translationJob, messageId } = translationJobMessage;
  let scrap = await ScrapsDB.getScrap(translationJob.originURL);

  while (!scrap) {
    translationJobMessage = await TranslationJobsQueue.consumeMessage();
    if (!translationJobMessage) {
      throw new Error(
        `translationHandler: No message found in the queue to process`
      );
    }
    translationJob = translationJobMessage.data;
    messageId = translationJobMessage.messageId;
    scrap = await ScrapsDB.getScrap(translationJob.originURL);
  }

  try {
    const headersArr = ScrapUtils.breakHTMLByHeaders(scrap.html);

    const translatedHTML = (
      await Promise.all(
        headersArr.map(async (h) => {
          const cleanText = await ContentAIUtils.cleanContent(
            h,
            translationJob.language
          );
          const translated = await ContentAIUtils.translateText(
            cleanText,
            translationJob.language
          );
          const improvedText = await ContentAIUtils.improveContent(
            translated,
            translationJob.language
          );

          return ScrapUtils.trimAndRemoveQuotes(improvedText);
        })
      )
    ).join(" ");

    await ArticleTranslationsDB.createOrUpdateArticleTranslation({
      source: translationJob.originURL,
      html: translatedHTML,
      language: translationJob.language,
    });

    await ContentAIEvents.CreatedForTranslation.publish({
      url: translationJob.originURL,
      language: translationJob.language,
    });

    await TranslationJobsQueue.deleteMessage(messageId);
  } catch (error: any) {
    console.error(`Error translating ${translationJob.originURL}: ${error}`);
  }
};

// export const postWordPressHandler = EventHandler(
//   ContentAIEvents.CreatedForTranslation,
//   async (evt) => {
//     const { html, jobId } = evt.properties;
//     const job = await TranslationJobsDB.getJob(jobId ?? "");

//     const wordPress = new WordPress(job.email, job.password, job.targetBlogURL);

//     const postContent = ScrapUtils.removeAllTags(html);

//     const getTagsAndCategories = async () => {
//       const tags = await wordPress.getTags();
//       const categories = await wordPress.getCategories();

//       const wordPressClassificationArgs =
//         await ContentAIUtils.getWordPressClassificationArgs(
//           postContent,
//           tags.map((t) => t.name),
//           categories.map((c) => c.name)
//         );

//       const categoriesIds = categories
//         .filter((c) => wordPressClassificationArgs.categories.includes(c.name))
//         .map((c) => c.id);

//       const tagsIds = tags
//         .filter((t) => wordPressClassificationArgs.tags.includes(t.name))
//         .map((t) => t.id);

//       return {
//         categoriesIds,
//         tagsIds,
//       };
//     };

//     const getFeaturedImage = async () => {
//       const { src } = await ContentAIUtils.getWordPressFeaturedImage(html);
//       const img = await ImagesBucket.retrieveImageFile(src);
//       return await wordPress.createMedia(img, src, {
//         status: "publish",
//         title: src,
//       });
//     };

//     const [wordPressSEOArgs, htmlWithImages, tagsAndCategories, wordPressImg] =
//       await Promise.all([
//         ContentAIUtils.getWordPressSEOArgs(postContent, job.language),
//         ScrapUtils.addBackImageUrls(html),
//         getTagsAndCategories(),
//         getFeaturedImage(),
//       ]);

//     await wordPress.createPost({
//       title: wordPressSEOArgs.title,
//       excerpt: wordPressSEOArgs.metaDescription,
//       meta: {
//         description: wordPressSEOArgs.metaDescription,
//       },
//       content: htmlWithImages,
//       status: "publish",
//       slug: wordPressSEOArgs?.slug ?? undefined,
//       categories: tagsAndCategories.categoriesIds,
//       tags: tagsAndCategories.tagsIds,
//       featured_media: wordPressImg.id,
//     });
//   }
// );
