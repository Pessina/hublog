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
  const url = evt.properties.url;
  const rawHTML = await Scrap.fetchPageContent(url);
  const cleanHTML = Scrap.cleanHTML(rawHTML);
  await Scrap.create(cleanHTML, evt.properties.language);
});

export const translationHandler = EventHandler(
  Scrap.Events.Created,
  async (evt) => {
    const wordpress = new WordPress(
      "fs.pessina@gmail.com",
      Config.WORDPRESS_API_KEY,
      "blogify.net"
    );
    const html = evt.properties.scrap;
    const translatedHTML = await Translation.translateHTML(
      html,
      evt.properties.language
    );
  }
);

export const addWordpressPostsHandler = ApiHandler(async (evt) => {
  const wordpress = new WordPress(
    "fs.pessina@gmail.com",
    "ZB3o htNT rd9m cgtF RYFM oL58",
    "blogify.net"
  );
  const evtJSON = JSON.parse(evt.body ?? "");
  const postData = {
    title: evtJSON.title,
    content: evtJSON.content,
    status: "publish",
  };
  const res = await wordpress.setPost(postData);
  return res;
});
