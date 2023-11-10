import { Config } from "sst/node/config";
import axios from "axios";
import { ChatGptService, contentPrompts } from "../gpt";
import { wordPressPrompts } from "../gpt/prompts/wordPress.prompt";

export class WordPress {
  private USERNAME: string;
  private PASSWORD: string;
  private HOSTNAME: string;
  private jobId?: string;

  constructor(
    username: string,
    password: string,
    hostname: string,
    jobId?: string
  ) {
    this.USERNAME = username;
    this.PASSWORD = password;
    this.HOSTNAME = hostname;
    this.jobId = jobId;
  }

  async getPosts() {
    try {
      const res = await axios.get(`${this.HOSTNAME}/wp-json/wp/v2/posts`);
      return res.data;
    } catch (error) {
      console.error(error);
    }
  }

  async setPost(postData: {
    date?: string;
    date_gmt?: string;
    slug?: string;
    status: string;
    password?: string;
    title: string;
    content: string;
    author?: number;
    excerpt?: string;
    featured_media?: number;
    comment_status?: string;
    ping_status?: string;
    format?: string;
    meta?: any;
    sticky?: boolean;
    template?: string;
    categories?: number[];
    tags?: number[];
  }) {
    try {
      const res = await axios.post(
        `${this.HOSTNAME}/wp-json/wp/v2/posts`,
        postData,
        {
          auth: {
            username: this.USERNAME,
            password: this.PASSWORD,
          },
        }
      );
      return res.data;
    } catch (error) {
      console.error(error);
    }
  }

  static async getWordPressArgs(html: string) {
    const gptService = new ChatGptService(Config.OPEN_AI_KEY);

    const wordPressArgs = await gptService.runGPTPipeline(
      wordPressPrompts.getWordPressArgs(html)
    );

    return wordPressArgs.messages[0];
  }
}
