import { buildAppSyncHandler } from "./handlers/appsyncGenerateUploadUrlHandler.js";
import { GeneratePresignedUploadUrl } from "./application/usecases/GeneratePresignedUploadUrl.js";
import { S3PresignerAws } from "./infrastructure/aws/S3PresignerAws.js";

const region = process.env.AWS_REGION || "eu-central-1";
const uploadBucket = process.env.UPLOAD_BUCKET;

const presigner = new S3PresignerAws(region);
const useCase = new GeneratePresignedUploadUrl({
  presigner,
  uploadBucket,
  defaultContentType: "application/pdf",
  expiresInSeconds: 300
});

export const handler = buildAppSyncHandler({ useCase });

