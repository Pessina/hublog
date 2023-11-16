import { Api, ApiHandler } from "sst/node/api";
import crypto from "crypto";

import { ContentAIEvents } from "@hublog/core/src/ScrapingStack/contentAI";
import { EventHandler } from "sst/node/event-bus";
import { UrlUtils, UrlEvents } from "@hublog/core/src/ScrapingStack/url";
import {
  ImageUtils,
  ImagesEvents,
} from "@hublog/core/src/ScrapingStack/images";
import { ScrapUtils } from "@hublog/core/src/ScrapingStack/scraping";
import { WordPress } from "@hublog/core/src/ScrapingStack/wordpress";
import {
  ScrapsDB,
  ArticleTranslationsDB,
} from "@hublog/core/src/ScrapingStack/db";
import { ImagesBucket } from "@hublog/core/src/ScrapingStack/s3";
import { APIUtils } from "@hublog/core/src/ScrapingStack/api";
import { getFirstImgSrc } from "@hublog/core/utils/utils";
import Utils from "@hublog/core/utils";
import { SQSEvent } from "aws-lambda";
import core from "@hublog/core/src/ScrapingStack";

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

export const translationHandler = async (message: SQSEvent) => {
  const { body } = message.Records[0];
  const data = Utils.zodValidate(
    JSON.parse(body),
    core.Queue.TranslationJobsQueue.translationJobsQueueSchema
  );

  let scrap = await ScrapsDB.getScrap(data.originURL);
  if (!scrap) {
    throw new Error(`No scrap found for URL ${data.originURL}`);
  }

  try {
    const headersArr = ScrapUtils.breakHTMLByHeaders(scrap.html);

    await Promise.all(
      headersArr.map(
        async (text) =>
          await fetch(`${process.env.OPEN_AI_SERVICE_URL}/chatgpt`, {
            method: "POST",
            body: JSON.stringify({
              prompt: Utils.GPT.contentPrompts.translateText(
                text,
                data.language
              ),
              callbackURL: `${Api.ScrapingStackAPI.url}/gpt-open-ai-service-handler`,
            }),
          })
      )
    );

    // const translatedHTML = (
    //   await Promise.all(
    //     headersArr.map(async (h) => {
    //       const cleanText = await ContentAIUtils.cleanContent(h);
    //       const translated = await ContentAIUtils.translateText(
    //         cleanText,
    //         data.language
    //       );
    //       const improvedText = await ContentAIUtils.improveReadability(
    //         translated,
    //         data.language
    //       );

    //       return ScrapUtils.trimAndRemoveQuotes(improvedText);
    //     })
    //   )
    // ).join(" ");

    // const SEOArgs = await ContentAIUtils.getSEOArgs(
    //   translatedHTML,
    //   data.language
    // );

    // await ArticleTranslationsDB.createOrUpdateArticleTranslation({
    //   source: data.originURL,
    //   title: SEOArgs.title,
    //   metaDescription: SEOArgs.metaDescription,
    //   slug: SEOArgs.slug,
    //   html: translatedHTML,
    //   language: data.language,
    // });

    // await ContentAIEvents.CreatedForTranslation.publish({
    //   url: data.originURL,
    //   language: data.language,
    //   email: data.email,
    //   password: data.password,
    //   blogURL: data.blogURL,
    // });
  } catch (error: any) {
    console.error(`Error translating ${data.originURL}: ${error}`);
  }
};

// export const postWordPressHandler = EventHandler(
//   ContentAIEvents.CreatedForTranslation,
//   async (evt) => {
//     const { url, language, email, password, blogURL } = evt.properties;
//     const articleTranslated = await ArticleTranslationsDB.getArticleTranslation(
//       url,
//       language
//     );

//     if (!articleTranslated) {
//       throw new Error(
//         `postWordPressHandler: No article found for ${url} in ${language}`
//       );
//     }

//     const wordPress = new WordPress(email, password, blogURL);

//     const getTagsAndCategories = async () => {
//       const tags = await wordPress.getTags();
//       const categories = await wordPress.getCategories();

//       const wordPressClassificationArgs =
//         await ContentAIUtils.getWordPressClassificationArgs(
//           articleTranslated.html,
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
//       const src = getFirstImgSrc(articleTranslated.html);
//       const img = await ImagesBucket.retrieveImageFile(src);
//       return await wordPress.createMedia(img, src, {
//         status: "publish",
//         title: src,
//       });
//     };

//     const [htmlWithImages, tagsAndCategories, wordPressImg] = await Promise.all(
//       [
//         ScrapUtils.addBackImageUrls(articleTranslated.html),
//         getTagsAndCategories(),
//         getFeaturedImage(),
//       ]
//     );

//     await wordPress.createPost({
//       title: articleTranslated.title,
//       excerpt: articleTranslated.metaDescription,
//       meta: {
//         description: articleTranslated.metaDescription,
//       },
//       content: htmlWithImages,
//       status: "publish",
//       slug: articleTranslated.slug,
//       categories: tagsAndCategories.categoriesIds,
//       tags: tagsAndCategories.tagsIds,
//       featured_media: wordPressImg.id,
//     });
//   }
// );

export const GPTOpenAIServiceHandler = ApiHandler(async (evt) => {
  try {
    const res = Utils.zodValidate(
      JSON.parse(evt.body ?? ""),
      Utils.GPT.responseSchema
    );

    console.log(res.choices[0].message.content);
  } catch {
    const res = Utils.zodValidate(
      JSON.parse(evt.body ?? ""),
      Utils.error.errorSchema
    );

    console.log(res.errorCode);
  }
});
