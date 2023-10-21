import { ApiHandler } from "sst/node/api";
import { cleanHTML, fetchPageContent } from "@hublog/core/src/scraping";
import { translateHTML } from "@hublog/core/src/translation";
import { EventHandler } from "sst/node/event-bus";
import * as Todo from "@hublog/core/src/translation";
import { SES } from "aws-sdk";

export const scrapingHandler = ApiHandler(async (evt) => {
  const url = JSON.parse(evt.body ?? "").url;

  const rawContent = await fetchPageContent(url);
  const cleanContent = cleanHTML(rawContent);

  await Todo.create(cleanContent);

  return {
    statusCode: 200,
  };
});

export const translationHandler = EventHandler(
  Todo.Events.Created,
  async (evt) => {
    const html = evt.properties.html;
    const translatedHTML = await translateHTML(html);

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
