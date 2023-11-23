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
import { ScrapsDB } from "@hublog/core/src/ScrapingStack/db";
import { ImagesBucket } from "@hublog/core/src/ScrapingStack/s3";
import { APIUtils } from "@hublog/core/src/ScrapingStack/api";
import Utils from "@hublog/core/utils";
import core from "@hublog/core/src/ScrapingStack";
import { DynamoDBStreamEvent, SQSEvent } from "aws-lambda";

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

export const translationJobTableConsumer = async (evt: DynamoDBStreamEvent) => {
  const record = evt.Records[0];
  if (record.eventName === "INSERT") {
    const id = record.dynamodb?.NewImage?.id.S;
    if (id) {
      core.Queue.TranslationJobs.emitMessage({ id });
    }
  }
};

export const translationJobQueueConsumer = async (evt: SQSEvent) => {
  const body = Utils.zodValidate(
    JSON.parse(evt.Records[0]?.body),
    core.Queue.TranslationJobs.translationJobsQueueSchema
  );
  if (body) {
    const res = await core.DB.TranslationJobs.get(body.id);
    if (!res) throw new Error(`No translation job found for ${body.id}`);

    let scrap = await ScrapsDB.getScrap(res?.originURL);
    if (!scrap) throw new Error(`No scrap found for ${res?.originURL}`);

    const headersArr = ScrapUtils.breakHTMLByHeaders(scrap.html).slice(0, 10);

    for (let index = 0; index < headersArr.length; index++) {
      const text = headersArr[index];
      const url = new URL(
        `${Api.ScrapingStackAPI.url}/gpt-open-ai-service-handler`
      );
      url.search = new URLSearchParams({
        groupId: body.id,
        partIndex: index.toString(),
        stage: "CLEAN",
        totalParts: headersArr.length.toString(),
      }).toString();

      await fetch(`${process.env.OPEN_AI_SERVICE_URL}/chatgpt`, {
        method: "POST",
        body: JSON.stringify({
          prompt: Utils.GPT.contentPrompts.cleanContent(text),
          callbackURL: url.toString(),
        }),
      });
    }
  }
};

// export const translationHandler = async (evt: any) => {
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
// };

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
  if (!evt.queryStringParameters) {
    console.error("No query string parameters found");
    return;
  }

  try {
    const res = Utils.zodValidate(
      JSON.parse(evt.body ?? ""),
      Utils.GPT.responseSchema
    );

    const { groupId, partIndex, stage, totalParts } = evt.queryStringParameters;

    if (
      !groupId ||
      partIndex === null ||
      partIndex === undefined ||
      !stage ||
      !totalParts
    ) {
      console.error("No query string parameters found");
      return;
    }

    const url = new URL(
      `${Api.ScrapingStackAPI.url}/gpt-open-ai-service-handler`
    );

    url.searchParams.set("groupId", groupId);
    url.searchParams.set("partIndex", partIndex);
    url.searchParams.set("totalParts", totalParts);

    const translationJob = await core.DB.TranslationJobs.get(groupId);
    if (!translationJob)
      throw new Error(`No translation job found for ${groupId}`);

    switch (stage) {
      case "CLEAN":
        url.searchParams.set("stage", "TRANSLATED");

        await fetch(`${process.env.OPEN_AI_SERVICE_URL}/chatgpt`, {
          method: "POST",
          body: JSON.stringify({
            prompt: Utils.GPT.contentPrompts.translateText(
              res.choices[0].message.content,
              translationJob?.language
            ),
            callbackURL: url.toString(),
          }),
        });
        break;
      case "TRANSLATED":
        url.searchParams.set("stage", "IMPROVED");

        await fetch(`${process.env.OPEN_AI_SERVICE_URL}/chatgpt`, {
          method: "POST",
          body: JSON.stringify({
            prompt: Utils.GPT.contentPrompts.improveReadability(
              res.choices[0].message.content,
              translationJob?.language
            ),
            callbackURL: url.toString(),
          }),
        });
        break;
      case "IMPROVED":
        core.DB.ProcessingJobs.createProcessingJob({
          groupId,
          partIndex: Number(partIndex),
          totalParts: Number(totalParts),
          status: "COMPLETED",
          content: res.choices[0].message.content,
        });
        break;
    }
  } catch (e) {
    console.error(e);
    const res = Utils.zodValidate(
      JSON.parse(evt.body ?? ""),
      Utils.error.errorSchema
    );

    console.log(res.errorCode);
  }
});
