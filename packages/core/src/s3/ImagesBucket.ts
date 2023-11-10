import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { Bucket } from "sst/node/bucket";

export const IMAGES_BUCKET = "ImagesBucket";

const s3Client = new S3Client({});

export const uploadImage = async (
  image: Buffer,
  imageName: string,
  config: { isPublic?: boolean } = {}
): Promise<void> => {
  const uploadParams = {
    Bucket: Bucket.ImagesBucket.bucketName,
    Key: imageName,
    Body: image,
    ACL: config.isPublic ? ObjectCannedACL.public_read : undefined,
  };
  try {
    await s3Client.send(new PutObjectCommand(uploadParams));
  } catch (err) {
    console.log("Error", err);
  }
};

export const retrieveImage = async (imageName: string): Promise<string> => {
  const retrieveParams = {
    Bucket: Bucket.ImagesBucket.bucketName,
    Key: imageName,
  };

  try {
    const response = await s3Client.send(new GetObjectCommand(retrieveParams));

    if (response?.Body) {
      return response.Body.toString();
    } else {
      console.error("Empty response body");
      return "";
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error:", err.message);
    } else {
      console.error("Unknown error:", err);
    }
    return "";
  }
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
