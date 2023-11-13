import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ObjectCannedACL,
  HeadObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Bucket } from "sst/node/bucket";
import { Readable } from "stream";

export const IMAGES_BUCKET = "ImagesBucket";

const s3Client = new S3Client({});

export const uploadImage = async (
  image: Buffer,
  imageName: string,
  config: { isPublic?: boolean } = {}
): Promise<void> => {
  const headParams = {
    Bucket: Bucket.ImagesBucket.bucketName,
    Key: imageName,
  };

  try {
    await s3Client.send(new HeadObjectCommand(headParams));
  } catch (headErr) {
    if ((headErr as { name: string }).name === "NotFound") {
      const uploadParams = {
        Bucket: Bucket.ImagesBucket.bucketName,
        Key: imageName,
        Body: image,
        ACL: config.isPublic ? ObjectCannedACL.public_read : undefined,
      };

      try {
        await s3Client.send(new PutObjectCommand(uploadParams));
      } catch (uploadErr) {
        console.log("Error during upload:", uploadErr);
      }
    } else {
      console.log("Error during existence check:", headErr);
    }
  }
};

export const retrieveImageURL = async (imageName: string): Promise<string> => {
  const bucketName = Bucket.ImagesBucket.bucketName;
  const s3Url = `https://${bucketName}.s3.amazonaws.com/${imageName}`;
  return s3Url;
};

export const retrieveImageFile = async (imageName: string): Promise<Buffer> => {
  const getObjectParams = {
    Bucket: Bucket.ImagesBucket.bucketName,
    Key: imageName,
  };

  try {
    const data = await s3Client.send(new GetObjectCommand(getObjectParams));
    if (!data.Body) {
      throw new Error("No body found in file");
    }
    const bodyContents = await streamToBuffer(data.Body as Readable);
    return bodyContents;
  } catch (err) {
    console.log("Error retrieving file", err);
    throw err;
  }
};

const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) =>
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
    );
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
};

export const deleteImage = async (imageName: string): Promise<void> => {
  const deleteParams = {
    Bucket: Bucket.ImagesBucket.bucketName,
    Key: imageName,
  };
  try {
    await s3Client.send(new DeleteObjectCommand(deleteParams));
  } catch (err) {
    console.log("Error", err);
  }
};
