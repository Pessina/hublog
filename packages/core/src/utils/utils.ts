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
