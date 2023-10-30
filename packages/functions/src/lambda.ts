import { ApiHandler } from "sst/node/api";

import { Translation } from "@hublog/core/src/translation";
import { EventHandler } from "sst/node/event-bus";
import { Url } from "@hublog/core/src/url";
import { Scrap } from "@hublog/core/src/scraping";
import { SES } from "aws-sdk";

export const sitemapUrlHandler = ApiHandler(async (evt) => {
  const evtJSON = JSON.parse(evt.body ?? "");
  const url = new URL(evtJSON.url);
  const domain = url.hostname;

  const urlList = await Scrap.checkRobotsAndSitemap(domain);
  await Promise.all(
    urlList.slice(0, 5).map(async (u) => Url.create(u, evtJSON.language))
  );

  return {
    statusCode: 200,
  };
});

export const singleUrlHandler = ApiHandler(async (evt) => {
  const evtJSON = JSON.parse(evt.body ?? "");
  try {
    const url = new URL(evtJSON.url);
    Url.create(url.href, evtJSON.language);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid URL format" }),
    };
  }

  return {
    statusCode: 200,
  };
});

export const urlListHandler = ApiHandler(async (evt) => {
  let urls: string[];
  const evtJSON = JSON.parse(evt.body ?? "");
  try {
    urls = evtJSON.urls;
    if (!Array.isArray(urls)) {
      throw new Error();
    }
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid URL list format" }),
    };
  }

  await Promise.all(
    urls.map(async (urlString) => {
      try {
        const url = new URL(urlString);
        Url.create(url.href, evtJSON.language);
      } catch (error) {
        console.error(`Invalid URL: ${urlString}`);
        return;
      }
    })
  );

  return {
    statusCode: 200,
  };
});

export const scrapingHandler = EventHandler(Url.Events.Created, async (evt) => {
  const url = evt.properties.url;
  const rawHTML = await Scrap.fetchPageContent(url);
  const cleanHTML = Scrap.cleanHTML(rawHTML);
  await Scrap.create(cleanHTML, evt.properties.language);
});

export const translationHandler = EventHandler(
  Scrap.Events.Created,
  async (evt) => {
    const html = evt.properties.scrap;
    const translatedHTML = await Translation.translateHTML(
      html,
      evt.properties.language
    );

    const ses = new SES({ region: "us-east-1" });

    const params = {
      Destination: {
        ToAddresses: ["fs.pessina@gmail.com"],
      },
      Message: {
        Body: {
          Text: { Data: translatedHTML },
        },
        Subject: { Data: "Translated HTML" },
      },
      Source: "fs.pessina@gmail.com",
    };

    try {
      const data = await ses.sendEmail(params).promise();
      console.log(data);
    } catch (error) {
      console.log(error);
    }
  }
);
