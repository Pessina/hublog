import axios from "axios";

export const processImageSrc = async (imgSrc: string): Promise<Buffer> => {
  let imageBuffer: Buffer;
  if (imgSrc.startsWith("data:image")) {
    const base64Image = imgSrc.split(";base64,").pop();
    if (base64Image) {
      imageBuffer = Buffer.from(base64Image, "base64");
    } else {
      throw new Error("Invalid base64 image source");
    }
  } else if (imgSrc.startsWith("http")) {
    const response = await axios.get(imgSrc, { responseType: "arraybuffer" });
    imageBuffer = Buffer.from(response.data, "binary");
  } else {
    throw new Error("Unsupported image source");
  }
  return imageBuffer;
};
