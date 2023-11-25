import { Api, ApiHandler } from "sst/node/api";
import crypto from "crypto";

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
import { GPTPrompt } from "@hublog/core/utils/GPT/schemas/types";
import { ProcessingJobStatus } from "@hublog/core/ScrapingStack/db/ProcessingJobs.db";

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
  const records = evt.Records.filter((r) => r.eventName === "INSERT");
  for (const r of records) {
    if (r.eventName === "INSERT") {
      const id = r.dynamodb?.NewImage?.id.S;
      if (id) {
        await core.Queue.TranslationJobs.emitMessage({ id });
      }
    }
  }
};

export const translationJobQueueConsumer = async (evt: SQSEvent) => {
  const translationJobMessage = Utils.zodValidate(
    JSON.parse(evt.Records[0]?.body),
    core.Queue.TranslationJobs.translationJobsQueueSchema
  );
  if (translationJobMessage) {
    const translationJob = await core.DB.TranslationJobs.get(
      translationJobMessage.id
    );
    if (!translationJob)
      throw new Error(
        `No translation job found for ${translationJobMessage.id}`
      );

    let scrap = await ScrapsDB.getScrap(translationJob?.originURL);
    if (!scrap)
      throw new Error(`No scrap found for ${translationJob?.originURL}`);

    const headersArr = ScrapUtils.breakHTMLByHeaders(scrap.html);

    for (let index = 0; index < headersArr.length; index++) {
      const text = headersArr[index];
      await core.DB.ProcessingJobs.createProcessingJob({
        groupId: translationJob.id,
        partIndex: index,
        totalParts: headersArr.length,
        status: core.DB.ProcessingJobs.ProcessingJobStatus.INITIAL,
        content: text,
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

export const processingJobsTableConsumer = async (evt: DynamoDBStreamEvent) => {
  const records = evt.Records.filter(
    (r) => r.eventName === "INSERT" || r.eventName === "MODIFY"
  );

  for (const r of records) {
    const newImage = r.dynamodb?.NewImage;
    const processingJob = Utils.zodValidate(
      {
        groupId: newImage?.groupId.S,
        partIndex: Number(newImage?.partIndex.N),
        totalParts: Number(newImage?.totalParts.N),
        status: newImage?.status.S,
        content: newImage?.content.S,
      },
      core.DB.ProcessingJobs.ProcessingJobSchema
    );

    const params = new URLSearchParams({
      groupId: processingJob.groupId,
      partIndex: processingJob.partIndex.toString(),
      totalParts: processingJob.totalParts.toString(),
    });
    const url = new URL(
      `${Api.ScrapingStackAPI.url}/gpt-open-ai-service-handler?${params}`
    );

    const translationJob = await core.DB.TranslationJobs.get(
      processingJob.groupId
    );

    if (!translationJob)
      throw new Error(`No translation job found for ${processingJob.groupId}`);

    let prompt: GPTPrompt | undefined = undefined;

    const { INITIAL, CLEAN, TRANSLATED, IMPROVED } =
      core.DB.ProcessingJobs.ProcessingJobStatus;

    switch (processingJob.status) {
      case INITIAL:
        url.searchParams.set("status", CLEAN);
        prompt = Utils.GPT.contentPrompts.cleanContent(processingJob.content);
        break;
      case CLEAN:
        url.searchParams.set("status", TRANSLATED);
        prompt = Utils.GPT.contentPrompts.translateText(
          processingJob.content,
          translationJob?.language
        );
        break;
      case TRANSLATED:
        url.searchParams.set("status", IMPROVED);
        prompt = Utils.GPT.contentPrompts.improveReadability(
          processingJob.content,
          translationJob?.language
        );
        break;
      case IMPROVED:
        continue;
    }

    const response = await fetch(`${process.env.OPEN_AI_SERVICE_URL}/chatgpt`, {
      method: "POST",
      body: JSON.stringify({
        prompt,
        callbackURL: url.toString(),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch from OpenAI Service. HTTP status: ${
          response.status
        }. body: ${JSON.stringify({
          prompt,
          callbackURL: url.toString(),
        })}`
      );
    }
  }
};

export const GPTOpenAIServiceHandler = ApiHandler(async (evt) => {
  try {
    if (!evt.queryStringParameters)
      throw new Error("No query string parameters found");

    const res = Utils.zodValidate(
      JSON.parse(evt.body ?? ""),
      Utils.GPT.responseSchema
    );

    const { groupId, status, partIndex, totalParts } =
      evt.queryStringParameters;

    if (
      !groupId ||
      !status ||
      partIndex === undefined ||
      partIndex === null ||
      totalParts === undefined ||
      totalParts === null
    ) {
      throw new Error(
        `Invalid or missing parameters. ${evt.queryStringParameters} `
      );
    }

    await core.DB.ProcessingJobs.createProcessingJob({
      groupId,
      partIndex: Number(partIndex),
      totalParts: Number(totalParts),
      status: status as ProcessingJobStatus,
      content: res.choices[0].message.content,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
});
