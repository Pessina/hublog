import crypto from "crypto";

export function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}

export function getFirstImgSrc(html: string): string {
  const imgTagRegex = /<img[^>]+src=(['"])(.*?)\1/gi;
  const match = imgTagRegex.exec(html);
  return match ? match[2] : "";
}

export async function retryStrategy<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryStrategy(fn, retries - 1, delay * 2);
  }
}
