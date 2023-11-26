import crypto from "crypto";

export function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}

export function getFirstImgSrc(html: string) {
  const imgTagStart = html.indexOf("<img");
  const imgTagEnd = html.indexOf(">", imgTagStart);
  const imgTag = html.slice(imgTagStart, imgTagEnd + 1);
  const srcStart = imgTag.indexOf('src="') + 5;
  const srcEnd = imgTag.indexOf('"', srcStart);
  return imgTag.slice(srcStart, srcEnd);
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
