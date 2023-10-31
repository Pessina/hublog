import { ApiHandler } from "sst/node/api";

import { Translation } from "@hublog/core/src/translation";
import { EventHandler } from "sst/node/event-bus";
import { Url } from "@hublog/core/src/url";
import { Scrap } from "@hublog/core/src/scraping";
import { WordPress } from "@hublog/core/src/wordpress";
import { Config } from "sst/node/config";

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
  const { url } = evt.properties;
  const rawHTML = await Scrap.fetchPageContent(url);
  const cleanHTML = Scrap.cleanHTML(rawHTML);
  await Scrap.create(cleanHTML, evt.properties.language);
});

export const translationHandler = EventHandler(
  Scrap.Events.Created,
  async (evt) => {
    const { language, scrap } = evt.properties;

    const wordpress = new WordPress(
      "fs.pessina@gmail.com",
      Config.WORDPRESS_API_KEY,
      "blogify.net"
    );

    const html = scrap;
    const translatedHTML = await Translation.translateHTML(html, language);

    await wordpress.setPost({
      title: "Translated Post",
      content: translatedHTML,
      status: "publish",
    });
  }
);

export const addWordPressPostHandler = ApiHandler(async (evt) => {
  const { html, title, status } = JSON.parse(evt.body ?? "");
  const wordpress = new WordPress(
    "fs.pessina@gmail.com",
    Config.WORDPRESS_API_KEY,
    "blogify.net"
  );

  await wordpress.setPost({
    title: title,
    content: html,
    status: status,
  });
});
