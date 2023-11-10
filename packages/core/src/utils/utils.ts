import crypto from "crypto";

export function hashUrl(url: string): string {
  return crypto.createHash("sha256").update(url).digest("hex");
}
