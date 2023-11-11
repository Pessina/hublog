import axios from "axios";

type Tag = {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  meta: any[];
};

type Category = {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
  meta: any[];
};

export class WordPress {
  private USERNAME: string;
  private PASSWORD: string;
  private HOSTNAME: string;

  constructor(username: string, password: string, hostname: string) {
    this.USERNAME = username;
    this.PASSWORD = password;
    this.HOSTNAME = hostname;
  }

  async getPosts() {
    try {
      const res = await axios.get(`${this.HOSTNAME}/wp-json/wp/v2/posts`);
      return res.data;
    } catch (error) {
      console.error(error);
    }
  }

  async createPost(postData: {
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

  async getMedia(mediaId: number) {
    try {
      const res = await axios.get(
        `${this.HOSTNAME}/wp-json/wp/v2/media/${mediaId}`
      );
      return res.data;
    } catch (error) {
      console.error(error);
    }
  }

  async createMedia(mediaData: {
    date?: string;
    date_gmt?: string;
    slug?: string;
    status: string;
    title: string;
    author?: number;
    comment_status?: string;
    ping_status?: string;
    meta?: any;
    template?: string;
    alt_text?: string;
    caption?: string;
    description?: string;
    post?: number;
  }) {
    try {
      const res = await axios.post(
        `${this.HOSTNAME}/wp-json/wp/v2/media`,
        mediaData,
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

  async getCategories(args?: { pageSize?: number }): Promise<Category[]> {
    try {
      const res = await axios.get(
        `${this.HOSTNAME}/wp-json/wp/v2/categories?per_page=${
          args?.pageSize ?? 100
        }`
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Creates a new category in WordPress.
   *
   * @param categoryData - The data for the new category.
   * @returns The created category.
   * @throws Will throw an error if a category with the same name already exists.
   */
  async createCategory(categoryData: {
    description?: string;
    name: string;
    slug?: string;
    parent?: number;
    meta?: any;
  }): Promise<Category> {
    try {
      const res = await axios.post(
        `${this.HOSTNAME}/wp-json/wp/v2/categories`,
        categoryData,
        {
          auth: {
            username: this.USERNAME,
            password: this.PASSWORD,
          },
        }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  async getTags(args?: { pageSize?: number }): Promise<Tag[]> {
    try {
      const res = await axios.get(
        `${this.HOSTNAME}/wp-json/wp/v2/tags?per_page=${args?.pageSize ?? 100}`
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Creates a new tag in WordPress.
   *
   * @param tagData - The data for the new tag.
   * @returns The created tag.
   * @throws Will throw an error if a tag with the same name already exists.
   */
  async createTag(tagData: {
    description?: string;
    name: string;
    slug?: string;
    meta?: any;
  }): Promise<Tag> {
    try {
      const res = await axios.post(
        `${this.HOSTNAME}/wp-json/wp/v2/tags`,
        tagData,
        {
          auth: {
            username: this.USERNAME,
            password: this.PASSWORD,
          },
        }
      );
      return res.data;
    } catch (error) {
      throw error;
    }
  }
}
