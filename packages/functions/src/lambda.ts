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
import { getFirstImgSrc } from "@hublog/core/utils/utils";

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
    await UrlUtils.createEventsForUrls(urls.slice(0, 3), destinations);
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
          const cleanText = await ContentAIUtils.cleanContent(h);
          const translated = await ContentAIUtils.translateText(
            cleanText,
            translationJob.language
          );
          const improvedText = await ContentAIUtils.improveReadability(
            translated,
            translationJob.language
          );

          return ScrapUtils.trimAndRemoveQuotes(improvedText);
        })
      )
    ).join(" ");

    const SEOArgs = await ContentAIUtils.getSEOArgs(
      translatedHTML,
      translationJob.language
    );

    await ArticleTranslationsDB.createOrUpdateArticleTranslation({
      source: translationJob.originURL,
      title: SEOArgs.title,
      metaDescription: SEOArgs.metaDescription,
      slug: SEOArgs.slug,
      html: translatedHTML,
      language: translationJob.language,
    });

    await ContentAIEvents.CreatedForTranslation.publish({
      url: translationJob.originURL,
      language: translationJob.language,
      email: translationJob.email,
      password: translationJob.password,
      blogURL: translationJob.blogURL,
    });

    await TranslationJobsQueue.deleteMessage(messageId);
  } catch (error: any) {
    console.error(`Error translating ${translationJob.originURL}: ${error}`);
  }
};

export const postWordPressHandler = EventHandler(
  ContentAIEvents.CreatedForTranslation,
  async (evt) => {
    const { url, language, email, password, blogURL } = evt.properties;
    const articleTranslated = await ArticleTranslationsDB.getArticleTranslation(
      url,
      language
    );

    if (!articleTranslated) {
      throw new Error(
        `postWordPressHandler: No article found for ${url} in ${language}`
      );
    }

    const wordPress = new WordPress(email, password, blogURL);

    const getTagsAndCategories = async () => {
      const tags = await wordPress.getTags();
      const categories = await wordPress.getCategories();

      const wordPressClassificationArgs =
        await ContentAIUtils.getWordPressClassificationArgs(
          articleTranslated.html,
          tags.map((t) => t.name),
          categories.map((c) => c.name)
        );

      const categoriesIds = categories
        .filter((c) => wordPressClassificationArgs.categories.includes(c.name))
        .map((c) => c.id);

      const tagsIds = tags
        .filter((t) => wordPressClassificationArgs.tags.includes(t.name))
        .map((t) => t.id);

      return {
        categoriesIds,
        tagsIds,
      };
    };

    const getFeaturedImage = async () => {
      const src = getFirstImgSrc(articleTranslated.html);
      const img = await ImagesBucket.retrieveImageFile(src);
      return await wordPress.createMedia(img, src, {
        status: "publish",
        title: src,
      });
    };

    const [htmlWithImages, tagsAndCategories, wordPressImg] = await Promise.all(
      [
        ScrapUtils.addBackImageUrls(articleTranslated.html),
        getTagsAndCategories(),
        getFeaturedImage(),
      ]
    );

    await wordPress.createPost({
      title: articleTranslated.title,
      excerpt: articleTranslated.metaDescription,
      meta: {
        description: articleTranslated.metaDescription,
      },
      content: htmlWithImages,
      status: "publish",
      slug: articleTranslated.slug,
      categories: tagsAndCategories.categoriesIds,
      tags: tagsAndCategories.tagsIds,
      featured_media: wordPressImg.id,
    });
  }
);
