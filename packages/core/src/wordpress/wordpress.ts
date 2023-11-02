import axios from "axios";

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
      const res = await axios.get(
        `https://${this.HOSTNAME}/wp-json/wp/v2/posts`
      );
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
        `https://${this.HOSTNAME}/wp-json/wp/v2/posts`,
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
}
