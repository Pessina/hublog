import { ApiHandler } from "sst/node/api";
import crypto from "crypto";

import { EventHandler } from "sst/node/event-bus";
import { UrlUtils, UrlEvents } from "@hublog/core/src/ScrapingStack/url";
import {
  ImageUtils,
  ImagesEvents,
} from "@hublog/core/src/ScrapingStack/images";
import { ScrapUtils } from "@hublog/core/src/ScrapingStack/scraping";
import { ScrapsDB } from "@hublog/core/src/ScrapingStack/db";
import { APIUtils } from "@hublog/core/src/ScrapingStack/api";
import Utils from "@hublog/core/utils";
import core from "@hublog/core/src/ScrapingStack";
import { DynamoDBStreamEvent, SQSEvent } from "aws-lambda";
import { GPTPrompt } from "@hublog/core/utils/GPT/schemas/types";
import { ProcessingTranslationStatus } from "@hublog/core/ScrapingStack/db/ProcessingTranslation.db";

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
    // TODO: Remove slice
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
    await core.S3.ImagesBucket.uploadImage(imageBuffer, name, {
      isPublic: true,
    });
  }
);

export const translationMetadataTableConsumer = async (
  evt: DynamoDBStreamEvent
) => {
  const records = evt.Records.filter((r) => r.eventName === "INSERT");

  for (const r of records) {
    const newImage = r.dynamodb?.NewImage;

    const translationMetadata = Utils.zodValidate(
      {
        id: newImage?.id.S,
        blogURL: newImage?.blogURL.S,
        language: newImage?.language.S,
        email: newImage?.email.S,
        password: newImage?.password.S,
        originURL: newImage?.originURL.S,
      },
      core.DB.TranslationMetadata.translationMetadataSchema
    );

    await core.Queue.TranslationMetadata.emit({ id: translationMetadata.id });
  }
};

export const translationMetadataQueueConsumer = async (evt: SQSEvent) => {
  const message = Utils.zodValidate(
    JSON.parse(evt.Records[0].body ?? ""),
    core.Queue.TranslationMetadata.translationMetadataQueueMessageSchema
  );

  const translationMetadata = await core.DB.TranslationMetadata.get(message.id);
  if (!translationMetadata)
    throw new Error(
      `No translation translation metadata found for ${message.id}`
    );

  let scrap = await ScrapsDB.getScrap(translationMetadata?.originURL);
  if (!scrap)
    throw new Error(
      `No scrap found for ${translationMetadata?.originURL} in ${translationMetadata?.language}`
    );

  const headersArr = ScrapUtils.breakHTMLByHeaders(scrap.html);

  for (let index = 0; index < headersArr.length; index++) {
    const text = headersArr[index];
    await core.DB.ProcessingTranslation.put({
      groupId: translationMetadata.id,
      partIndex: index,
      totalParts: headersArr.length,
      status: core.DB.ProcessingTranslation.ProcessingTranslationStatus.INITIAL,
      content: text,
    });
  }
};

export const processingTranslationTableConsumer = async (
  evt: DynamoDBStreamEvent
) => {
  const records = evt.Records.filter((r) => r.eventName === "INSERT");

  await Promise.all(
    records.map(async (r) => {
      const newImage = r.dynamodb?.NewImage;
      const processingTranslationInitial = Utils.zodValidate(
        {
          groupId: newImage?.groupId.S,
          partIndex: Number(newImage?.partIndex.N),
          totalParts: Number(newImage?.totalParts.N),
          status: newImage?.status.S,
          content: newImage?.content.S,
        },
        core.DB.ProcessingTranslation.processingTranslationSchema
      );

      await Utils.StateMachine.startStateMachine(
        process.env.STATE_MACHINE ?? "",
        JSON.stringify(processingTranslationInitial)
      );
    })
  );
};

export const translationHandler = async (evt: any) => {
  const processingTranslationInitial = Utils.zodValidate(
    evt,
    core.DB.ProcessingTranslation.processingTranslationSchema
  );

  let processingTranslationCurrent = await core.DB.ProcessingTranslation.get(
    processingTranslationInitial.groupId,
    processingTranslationInitial.partIndex
  );
  if (!processingTranslationCurrent) {
    console.error(
      `No processing translation found for ${processingTranslationInitial.groupId} and ${processingTranslationInitial.partIndex}`
    );
    return;
  }

  const { groupId } = processingTranslationCurrent;
  let { content, status } = processingTranslationCurrent;
  const { INITIAL, CLEAN, TRANSLATED, IMPROVED } =
    core.DB.ProcessingTranslation.ProcessingTranslationStatus;

  const translationMetadata = await core.DB.TranslationMetadata.get(groupId);

  if (!translationMetadata)
    throw new Error(`No translation job found for ${groupId}`);

  async function processTranslationPrompt(args: {
    groupId: string;
    partIndex: number;
    totalParts: number;
    status: ProcessingTranslationStatus;
    prompt: GPTPrompt;
  }) {
    const gptRes = await Utils.GPT.callChatCompletions(args.prompt);
    if (!gptRes)
      throw new Error(
        `processingTranslationTableConsumer: No GPT response for ${args.groupId} and ${args.partIndex}`
      );

    const content =
      JSON.parse(gptRes.choices[0].message.content ?? "")?.html ?? "";

    await core.DB.ProcessingTranslation.put({
      groupId: args.groupId,
      partIndex: Number(args.partIndex),
      totalParts: Number(args.totalParts),
      status: args.status,
      content,
    });
    return content;
  }

  if (status === INITIAL) {
    content = await processTranslationPrompt({
      ...processingTranslationCurrent,
      status: CLEAN,
      prompt: Utils.GPT.contentPrompts.cleanContent(content),
    });
    status = CLEAN;
  }

  if (status === CLEAN) {
    content = await processTranslationPrompt({
      ...processingTranslationCurrent,
      status: TRANSLATED,
      prompt: Utils.GPT.contentPrompts.translateText(
        content,
        translationMetadata?.language
      ),
    });
    status = TRANSLATED;
  }

  if (status === TRANSLATED) {
    content = await processTranslationPrompt({
      ...processingTranslationCurrent,
      status: IMPROVED,
      prompt: Utils.GPT.contentPrompts.improveReadability(
        content,
        translationMetadata?.language
      ),
    });
    status = IMPROVED;
  }

  if (status === IMPROVED) {
    const article =
      await core.DB.ProcessingTranslation.validateAndRetrieveProcessingTranslations(
        groupId
      );

    if (article) {
      const articleHTML = article.reduce((acc, curr) => acc + curr.content, "");
      const gptRes = await Utils.GPT.callChatCompletions(
        Utils.GPT.contentPrompts.getSEOArgs(
          articleHTML,
          translationMetadata.language
        )
      );
      if (!gptRes)
        throw new Error(
          `processingTranslationTableConsumer: No GPT response for ${groupId}`
        );

      const seoArgs = JSON.parse(gptRes.choices[0].message.content ?? "");

      await core.DB.TranslatedArticles.put({
        source: translationMetadata.originURL,
        title: seoArgs.title,
        metaDescription: seoArgs.metaDescription,
        slug: seoArgs.slug,
        html: articleHTML,
        language: translationMetadata.language,
      });
      await core.DB.ProcessingTranslation.deleteProcessingTranslationsByGroupId(
        groupId
      );
    }
  }
};

export const translatedArticlesTableConsumer = async (
  evt: DynamoDBStreamEvent
) => {
  const records = evt.Records.filter((r) => r.eventName === "INSERT");

  await Promise.all(
    records.map(async (r) => {
      const newImage = r.dynamodb?.NewImage;
      const translatedArticle = Utils.zodValidate(
        {
          source: newImage?.source.S,
          title: newImage?.title.S,
          metaDescription: newImage?.metaDescription.S,
          slug: newImage?.slug.S,
          html: newImage?.html.S,
          language: newImage?.language.S,
          createdAt: newImage?.createdAt.S,
          updatedAt: newImage?.updatedAt.S,
        },
        core.DB.TranslatedArticles.translatedArticlesSchema
      );

      const translationMetadata =
        await core.DB.TranslationMetadata.getByOriginURLAndLanguage(
          translatedArticle.source,
          translatedArticle.language
        );
      if (!translationMetadata)
        throw new Error(`postWordPressHandler: No translation metadata found`);

      await Promise.all(
        translationMetadata.map(async ({ email, password, blogURL }) => {
          const wordPress = new Utils.WordPress.WordPress(
            email,
            password,
            blogURL
          );

          const getTagsAndCategories = async () => {
            const tags = await wordPress.getTags();
            const categories = await wordPress.getCategories();

            const prompt =
              Utils.GPT.wordPressPrompts.getWordPressClassificationArgs(
                translatedArticle.html,
                tags.map((t) => t.name),
                categories.map((c) => c.name)
              );
            const gptRes = await Utils.GPT.callChatCompletions(prompt);
            if (!gptRes)
              throw new Error(
                `translatedArticlesTableConsumer: No GPT response for ${translatedArticle.source} and ${translatedArticle.language}`
              );

            const wordPressClassificationArgs = JSON.parse(
              gptRes.choices[0].message.content ?? ""
            );

            const categoriesIds = categories
              .filter((c) =>
                wordPressClassificationArgs.categories.includes(c.name)
              )
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
            const src = Utils.utils.getFirstImgSrc(translatedArticle.html);
            const img = await core.S3.ImagesBucket.retrieveImageFile(src);
            return await wordPress.createMedia(img, src, {
              status: "publish",
              title: src,
            });
          };

          const [htmlWithImages, tagsAndCategories, wordPressImg] =
            await Promise.all([
              ScrapUtils.addBackImageUrls(translatedArticle.html),
              getTagsAndCategories(),
              getFeaturedImage(),
            ]);

          await wordPress.createPost({
            title: translatedArticle.title,
            excerpt: translatedArticle.metaDescription,
            meta: {
              description: translatedArticle.metaDescription,
            },
            content: htmlWithImages,
            status: "publish",
            slug: translatedArticle.slug,
            categories: tagsAndCategories.categoriesIds,
            tags: tagsAndCategories.tagsIds,
            featured_media: wordPressImg.id,
          });
        })
      );
      await core.DB.TranslationMetadata.deleteRecords(
        translationMetadata.map((t) => t.id)
      );
    })
  );
};
