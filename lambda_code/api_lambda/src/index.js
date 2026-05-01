import { buildAppSyncHandler } from "./handlers/appsyncHandler.js";
import { HandleAppSyncRequest } from "./application/usecases/HandleAppSyncRequest.js";
import { ConfigServiceAdapter } from "./infrastructure/config/ConfigServiceAdapter.js";

const bucket = process.env.S3_BUCKET_NAME || "sms-platform-dev-uploads";

const configService = new ConfigServiceAdapter();
const useCase = new HandleAppSyncRequest({
  configService,
  defaultBucket: bucket
});

export const handler = buildAppSyncHandler({ useCase });