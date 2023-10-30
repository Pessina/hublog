import { ApiHandler } from "sst/node/api";

import { Translation } from "@hublog/core/src/translation";
import { EventHandler } from "sst/node/event-bus";
import { Url } from "@hublog/core/src/url";
import { Scrap } from "@hublog/core/src/scraping";
import { SES } from "aws-sdk";

export const urlHandler = ApiHandler(async (evt) => {
  const url = new URL(JSON.parse(evt.body ?? "").url);
  const domain = url.hostname;

  const urlList = await Scrap.checkRobotsAndSitemap(domain);
  await Promise.all(urlList.slice(0, 2).map(async (u) => Url.create(u)));

  return {
    statusCode: 200,
  };
});

export const scrapingHandler = EventHandler(Url.Events.Created, async (evt) => {
  const url = evt.properties.url;
  const rawHTML = await Scrap.fetchPageContent(url);
  const cleanHTML = Scrap.cleanHTML(rawHTML);
  await Scrap.create(cleanHTML);
});

export const translationHandler = EventHandler(
  Scrap.Events.Created,
  async (evt) => {
    const html = evt.properties.scrap;
    const translatedHTML = await Translation.translateHTML(html);

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
