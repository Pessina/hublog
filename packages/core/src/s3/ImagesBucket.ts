import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Bucket } from "sst/node/bucket";

export const IMAGES_BUCKET = "ImagesBucket";

const s3Client = new S3Client({});

export const uploadImage = async (
  image: Buffer,
  imageName: string
): Promise<void> => {
  const uploadParams = {
    Bucket: Bucket.ImagesBucket.bucketName,
    Key: imageName,
    Body: image,
  };
  try {
    const data = await s3Client.send(new PutObjectCommand(uploadParams));
    console.log("Image uploaded successfully", data);
  } catch (err) {
    console.log("Error", err);
  }
};

export const retrieveImage = async (imageName: string): Promise<void> => {
  const retrieveParams = {
    Bucket: Bucket.ImagesBucket.bucketName,
    Key: imageName,
  };
  try {
    const data = await s3Client.send(new GetObjectCommand(retrieveParams));
    console.log("Image retrieved successfully", data);
  } catch (err) {
    console.log("Error", err);
  }
};

export const deleteImage = async (imageName: string): Promise<void> => {
  const deleteParams = {
    Bucket: Bucket.ImagesBucket.bucketName,
    Key: imageName,
  };
  try {
    const data = await s3Client.send(new DeleteObjectCommand(deleteParams));
    console.log("Image deleted successfully", data);
  } catch (err) {
    console.log("Error", err);
  }
};
